import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileSynthesisService } from './profile-synthesis.service';

@Injectable()
export class ImplicitFeedbackService {
  private readonly logger = new Logger(ImplicitFeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly profileSynthesis: ProfileSynthesisService,
  ) {}

  /**
   * Registra o actualiza la vista de un tráiler.
   * Si el usuario ya vio el tráiler antes, actualiza los segundos si vio más.
   */
  async recordTrailerView(userId: string, tmdbId: number, watchedSecs: number): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO "TrailerView" ("id", "userId", "tmdbId", "watchedSecs", "createdAt")
      VALUES (gen_random_uuid()::text, ${userId}, ${tmdbId}, ${watchedSecs}, NOW())
      ON CONFLICT ("userId", "tmdbId")
      DO UPDATE SET "watchedSecs" = GREATEST("TrailerView"."watchedSecs", ${watchedSecs})
    `;

    this.logger.debug(`🎬 Trailer view: user=${userId} tmdb=${tmdbId} secs=${watchedSecs}`);
  }

  /**
   * CronJob semanal: detecta recomendaciones ignoradas y actualiza el perfil.
   * Corre todos los martes a las 3:00 AM (un día después del CronJob de síntesis).
   */
  @Cron('0 3 * * 2')
  async processIgnoredRecommendations(): Promise<void> {
    this.logger.log('🔍 Procesando recomendaciones ignoradas...');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Usuarios activos en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await this.prisma.user.findMany({
      where: { ActivityLog: { some: { createdAt: { gte: thirtyDaysAgo } } } },
      select: { id: true },
    });

    for (const user of activeUsers) {
      try {
        await this.processUserImplicitFeedback(user.id, sevenDaysAgo);
      } catch (error) {
        this.logger.error(`❌ Error procesando feedback implícito de ${user.id}: ${error.message}`);
      }
    }

    this.logger.log('✅ Procesamiento de feedback implícito completado');
  }

  /**
   * Analiza el feedback implícito de un usuario y actualiza su perfil si hay señales relevantes.
   */
  async processUserImplicitFeedback(userId: string, since: Date): Promise<void> {
    // Recomendaciones de la semana pasada
    const recentRecs = await this.prisma.recommendation.findMany({
      where: { userId, createdAt: { gte: since } },
      include: { tmdb: { select: { id: true, title: true, mediaType: true } } },
    });

    if (recentRecs.length === 0) return;

    const recTmdbIds = recentRecs.map((r) => r.tmdbId);

    // Qué hizo el usuario con esas recomendaciones
    const [seenIds, favoriteIds, wishlistIds, ratingIds, trailerViews] = await Promise.all([
      this.prisma.seenItem.findMany({
        where: { userId, tmdbId: { in: recTmdbIds } },
        select: { tmdbId: true },
      }),
      this.prisma.favorite.findMany({
        where: { userId, tmdbId: { in: recTmdbIds } },
        select: { tmdbId: true },
      }),
      this.prisma.wishListItem.findMany({
        where: { userId, tmdbId: { in: recTmdbIds } },
        select: { tmdbId: true },
      }),
      this.prisma.rating.findMany({
        where: { userId, tmdbId: { in: recTmdbIds } },
        select: { tmdbId: true, rating: true },
      }),
      this.prisma.$queryRaw<Array<{ tmdbId: number; watchedSecs: number }>>`
        SELECT "tmdbId", "watchedSecs"
        FROM "TrailerView"
        WHERE "userId" = ${userId}
          AND "tmdbId" = ANY(${recTmdbIds}::int[])
      `,
    ]);

    const interactedIds = new Set([
      ...seenIds.map((s) => s.tmdbId),
      ...favoriteIds.map((f) => f.tmdbId),
      ...wishlistIds.map((w) => w.tmdbId),
      ...ratingIds.map((r) => r.tmdbId),
    ]);

    const trailerViewMap = new Map(
      (trailerViews as any[]).map((t) => [t.tmdbId, t.watchedSecs]),
    );

    // Clasificar recomendaciones
    const ignored: string[] = [];
    const trailerOnlyInterest: string[] = []; // Vio tráiler pero no guardó

    for (const rec of recentRecs) {
      const title = rec.tmdb?.title;
      if (!title) continue;

      const wasInteracted = interactedIds.has(rec.tmdbId);
      const trailerSecs = trailerViewMap.get(rec.tmdbId) ?? 0;

      if (!wasInteracted && trailerSecs === 0) {
        // Completamente ignorado
        ignored.push(title);
      } else if (!wasInteracted && trailerSecs > 0) {
        // Vio el tráiler pero no guardó → interés visual pero no convencido
        trailerOnlyInterest.push(`${title} (vio ${trailerSecs}s del tráiler)`);
      }
    }

    // Solo actualizar el perfil si hay señales significativas
    const hasSignificantSignals = ignored.length >= 3 || trailerOnlyInterest.length >= 2;
    if (!hasSignificantSignals) return;

    this.logger.log(
      `📊 User ${userId}: ${ignored.length} ignoradas, ${trailerOnlyInterest.length} solo tráiler`,
    );

    // Guardar las señales en el ActivityLog para que el ProfileSynthesisService las use
    if (ignored.length > 0) {
      await this.prisma.$executeRaw`
        UPDATE "User"
        SET "aiProfileUpdatedAt" = '1970-01-01'::timestamp
        WHERE id = ${userId}
      `;
      // Forzar re-síntesis del perfil con esta nueva información
      await this.profileSynthesis.synthesizeUserProfileWithImplicitFeedback(
        userId,
        ignored,
        trailerOnlyInterest,
      );
    }
  }
}

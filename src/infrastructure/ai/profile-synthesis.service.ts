import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileSynthesisService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(ProfileSynthesisService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * CronJob semanal: sintetiza el perfil de gustos de cada usuario activo.
   * Corre todos los lunes a las 3:00 AM.
   */
  @Cron('0 3 * * 1')
  async synthesizeAllActiveUsers(): Promise<void> {
    this.logger.log('🧠 Iniciando síntesis semanal de perfiles de usuario...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await this.prisma.user.findMany({
      where: {
        ActivityLog: {
          some: { createdAt: { gte: thirtyDaysAgo } },
        },
      },
      select: { id: true },
    });

    this.logger.log(`📋 ${activeUsers.length} usuarios activos encontrados`);

    for (const user of activeUsers) {
      try {
        await this.synthesizeUserProfile(user.id);
        this.logger.log(`✅ Perfil sintetizado para usuario ${user.id}`);
      } catch (error) {
        this.logger.error(`❌ Error sintetizando perfil de ${user.id}: ${error.message}`);
      }
    }

    this.logger.log('🎉 Síntesis semanal completada');
  }

  /**
   * Sintetiza y guarda el perfil de un usuario específico.
   */
  async synthesizeUserProfile(userId: string): Promise<string> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [ratings, favorites, seenItems, dislikedItems, currentUser] = await Promise.all([
      this.prisma.rating.findMany({
        where: { userId },
        include: { tmdb: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.favorite.findMany({
        where: { userId },
        include: { tmdb: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.seenItem.findMany({
        where: { userId, createdAt: { gte: weekAgo } },
        include: { tmdb: { select: { title: true } } },
      }),
      this.prisma.dislikedItem.findMany({
        where: { userId },
        include: { tmdb: { select: { title: true } } },
        take: 20,
      }),
      // Usamos $queryRaw para leer campos nuevos antes de regenerar el cliente
      this.prisma.$queryRaw<Array<{ aiProfile: string | null; favoriteGenres: string[]; favoriteMedia: string | null }>>`
        SELECT "aiProfile", "favoriteGenres", "favoriteMedia"
        FROM "User"
        WHERE id = ${userId}
        LIMIT 1
      `,
    ]);

    const userRow = (currentUser as any[])[0] ?? {};

    const prompt = this.buildSynthesisPrompt({
      ratings,
      favorites,
      seenItems,
      dislikedItems,
      previousProfile: userRow.aiProfile ?? null,
      favoriteGenres: userRow.favoriteGenres ?? [],
      favoriteMedia: userRow.favoriteMedia ?? null,
    });

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un psicólogo del entretenimiento. Tu tarea es crear perfiles de gustos concisos y precisos basados en el comportamiento del usuario.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const newProfile = response.choices[0].message.content?.trim() ?? '';

    // Guardar con raw query para no depender del cliente regenerado
    await this.prisma.$executeRaw`
      UPDATE "User"
      SET "aiProfile" = ${newProfile},
          "aiProfileUpdatedAt" = NOW()
      WHERE id = ${userId}
    `;

    this.logger.debug(`📝 Nuevo perfil para ${userId}: ${newProfile.substring(0, 100)}...`);
    return newProfile;
  }

  /**
   * Obtiene el perfil IA de un usuario, generándolo si no existe o está desactualizado.
   */
  async getOrGenerateProfile(userId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{ aiProfile: string | null; aiProfileUpdatedAt: Date | null }>
    >`
      SELECT "aiProfile", "aiProfileUpdatedAt"
      FROM "User"
      WHERE id = ${userId}
      LIMIT 1
    `;

    const user = rows[0];
    if (!user) return null;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const isStale =
      !user.aiProfile ||
      !user.aiProfileUpdatedAt ||
      user.aiProfileUpdatedAt < sevenDaysAgo;

    if (isStale) {
      try {
        return await this.synthesizeUserProfile(userId);
      } catch (error) {
        this.logger.warn(`⚠️ No se pudo generar perfil para ${userId}: ${error.message}`);
        return user.aiProfile ?? null;
      }
    }

    return user.aiProfile;
  }

  /**
   * Actualiza el perfil incorporando señales de feedback implícito
   * (recomendaciones ignoradas y tráilers vistos sin guardar).
   */
  async synthesizeUserProfileWithImplicitFeedback(
    userId: string,
    ignoredTitles: string[],
    trailerOnlyTitles: string[],
  ): Promise<void> {
    const rows = await this.prisma.$queryRaw<Array<{ aiProfile: string | null }>>`
      SELECT "aiProfile" FROM "User" WHERE id = ${userId} LIMIT 1
    `;
    const previousProfile = rows[0]?.aiProfile ?? null;

    const lines: string[] = [
      'Actualiza el perfil de gustos del usuario incorporando estas nuevas señales de comportamiento.',
      '',
    ];

    if (previousProfile) {
      lines.push(`PERFIL ACTUAL:\n"${previousProfile}"`);
      lines.push('');
    }

    if (ignoredTitles.length > 0) {
      lines.push(`❌ IGNORÓ COMPLETAMENTE estas recomendaciones (no las vio, no las guardó):`);
      lines.push(ignoredTitles.join(', '));
      lines.push('→ Penaliza ligeramente el tipo de contenido que representan.');
      lines.push('');
    }

    if (trailerOnlyTitles.length > 0) {
      lines.push(`👀 Vio el tráiler pero NO guardó ni vio:`);
      lines.push(trailerOnlyTitles.join(', '));
      lines.push('→ El estilo visual le llama la atención pero algo lo frenó. Nota este patrón.');
      lines.push('');
    }

    lines.push('Responde SOLO con el perfil actualizado en texto. Máximo 3 oraciones.');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un psicólogo del entretenimiento. Actualiza perfiles de gustos con señales de comportamiento implícito.',
        },
        { role: 'user', content: lines.join('\n') },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const newProfile = response.choices[0].message.content?.trim() ?? '';

    await this.prisma.$executeRaw`
      UPDATE "User"
      SET "aiProfile" = ${newProfile},
          "aiProfileUpdatedAt" = NOW()
      WHERE id = ${userId}
    `;

    this.logger.log(`🧠 Perfil actualizado con feedback implícito para ${userId}`);
  }

  // ─── helpers privados ────────────────────────────────────────────────────────

  private buildSynthesisPrompt(data: {
    ratings: any[];
    favorites: any[];
    seenItems: any[];
    dislikedItems: any[];
    previousProfile: string | null;
    favoriteGenres: string[];
    favoriteMedia: string | null;
  }): string {
    const lines: string[] = [];

    lines.push('Analiza el comportamiento de este usuario y crea un perfil de gustos en 2-3 oraciones.');
    lines.push('El perfil debe capturar: géneros preferidos, tipos de narrativa, lo que evita, y patrones de consumo.');
    lines.push('');

    if (data.previousProfile) {
      lines.push(`PERFIL ANTERIOR (actualiza y mejora):\n"${data.previousProfile}"`);
      lines.push('');
    }

    if (data.favoriteGenres.length > 0) {
      lines.push(`Géneros declarados: ${data.favoriteGenres.join(', ')}`);
    }
    if (data.favoriteMedia) {
      lines.push(`Gustos declarados: ${data.favoriteMedia}`);
    }

    const highRated = data.ratings
      .filter((r) => r.rating >= 4)
      .map((r) => `${r.tmdb?.title} (${r.rating}/5)`)
      .slice(0, 15);
    if (highRated.length > 0) {
      lines.push(`\nCalificó alto: ${highRated.join(', ')}`);
    }

    const lowRated = data.ratings
      .filter((r) => r.rating <= 2.5)
      .map((r) => `${r.tmdb?.title} (${r.rating}/5)`)
      .slice(0, 10);
    if (lowRated.length > 0) {
      lines.push(`Calificó bajo: ${lowRated.join(', ')}`);
    }

    const favTitles = data.favorites.map((f) => f.tmdb?.title).filter(Boolean).slice(0, 15);
    if (favTitles.length > 0) {
      lines.push(`Favoritos: ${favTitles.join(', ')}`);
    }

    const dislikedTitles = data.dislikedItems.map((d) => d.tmdb?.title).filter(Boolean).slice(0, 10);
    if (dislikedTitles.length > 0) {
      lines.push(`Descartó (no le gustó): ${dislikedTitles.join(', ')}`);
    }

    const seenTitles = data.seenItems.map((s) => s.tmdb?.title).filter(Boolean).slice(0, 10);
    if (seenTitles.length > 0) {
      lines.push(`Vio esta semana: ${seenTitles.join(', ')}`);
    }

    lines.push('');
    lines.push('Responde SOLO con el perfil en texto, sin títulos ni listas. Máximo 3 oraciones.');

    return lines.join('\n');
  }
}

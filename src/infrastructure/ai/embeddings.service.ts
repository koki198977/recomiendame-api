import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmbeddingsService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(EmbeddingsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  // ─── Backfill ─────────────────────────────────────────────────────────────

  /**
   * CronJob diario: genera embeddings para todos los Tmdb que aún no tienen.
   * Procesa en lotes de 20 para no saturar la API de OpenAI.
   * Corre a las 2:00 AM todos los días.
   */
  @Cron('0 2 * * *')
  async backfillMissingEmbeddings(): Promise<void> {
    this.logger.log('🔄 Iniciando backfill de embeddings...');

    const pending = await this.prisma.$queryRaw<Array<{ id: number; title: string; overview: string | null; mediaType: string }>>`
      SELECT id, title, overview, "mediaType"
      FROM "Tmdb"
      WHERE embedding IS NULL
      ORDER BY "createdAt" DESC
      LIMIT 200
    `;

    if ((pending as any[]).length === 0) {
      this.logger.log('✅ Todos los contenidos ya tienen embedding');
      return;
    }

    this.logger.log(`📋 ${(pending as any[]).length} contenidos sin embedding`);

    let processed = 0;
    const BATCH_SIZE = 20;

    for (let i = 0; i < (pending as any[]).length; i += BATCH_SIZE) {
      const batch = (pending as any[]).slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (item) => {
          try {
            const text = this.buildEmbeddingText(item);
            const vector = await this.getEmbedding(text);
            await this.saveEmbedding(item.id, vector);
            processed++;
          } catch (error) {
            this.logger.warn(`⚠️ Error en backfill para ${item.id}: ${error.message}`);
          }
        }),
      );

      // Pequeña pausa entre lotes para respetar rate limits
      if (i + BATCH_SIZE < (pending as any[]).length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    this.logger.log(`✅ Backfill completado: ${processed} embeddings generados`);
  }

  // ─── Embedding individual ─────────────────────────────────────────────────

  /**
   * Genera y guarda el embedding de un contenido específico.
   * Se llama cuando el usuario agrega un favorito o dislike.
   */
  async generateAndSaveEmbedding(tmdbId: number): Promise<void> {
    const tmdb = await this.prisma.tmdb.findUnique({ where: { id: tmdbId } });
    if (!tmdb) {
      this.logger.warn(`Tmdb ${tmdbId} no encontrado, saltando embedding`);
      return;
    }

    if ((tmdb as any).embedding) {
      this.logger.debug(`Tmdb ${tmdbId} ya tiene embedding`);
      return;
    }

    const text = this.buildEmbeddingText(tmdb);

    try {
      const vector = await this.getEmbedding(text);
      await this.saveEmbedding(tmdbId, vector);
      this.logger.log(`✅ Embedding guardado para "${tmdb.title}" (ID: ${tmdbId})`);
    } catch (error) {
      this.logger.error(`❌ Error generando embedding para ${tmdbId}: ${error.message}`);
    }
  }

  // ─── Vector de perfil del usuario ────────────────────────────────────────

  /**
   * Calcula el vector de perfil del usuario combinando:
   * - Favoritos (peso 1.0)
   * - Ratings >= 4 (peso 0.8)
   * - Dislikes (peso -1.0, resta del perfil)
   *
   * Retorna null si el usuario no tiene suficiente data con embeddings.
   */
  async getUserProfileVector(userId: string): Promise<number[] | null> {
    const [likeRows, ratingRows, dislikeRows] = await Promise.all([
      // Favoritos
      this.prisma.$queryRaw<Array<{ embedding: string }>>`
        SELECT t.embedding::text
        FROM "Favorite" f
        JOIN "Tmdb" t ON t.id = f."tmdbId"
        WHERE f."userId" = ${userId}
          AND t.embedding IS NOT NULL
      `,
      // Ratings altos (>= 4)
      this.prisma.$queryRaw<Array<{ embedding: string; rating: number }>>`
        SELECT t.embedding::text, r.rating
        FROM "Rating" r
        JOIN "Tmdb" t ON t.id = r."tmdbId"
        WHERE r."userId" = ${userId}
          AND r.rating >= 4
          AND t.embedding IS NOT NULL
      `,
      // Dislikes
      this.prisma.$queryRaw<Array<{ embedding: string }>>`
        SELECT t.embedding::text
        FROM "DislikedItem" d
        JOIN "Tmdb" t ON t.id = d."tmdbId"
        WHERE d."userId" = ${userId}
          AND t.embedding IS NOT NULL
      `,
    ]);

    const totalSignals =
      (likeRows as any[]).length +
      (ratingRows as any[]).length +
      (dislikeRows as any[]).length;

    if (totalSignals === 0) return null;

    // Dimensión del vector (text-embedding-3-small = 1536)
    const DIM = 1536;
    const profile = new Array(DIM).fill(0);

    // Sumar favoritos con peso 1.0
    for (const row of likeRows as any[]) {
      const v = this.parseVector(row.embedding);
      for (let i = 0; i < DIM; i++) profile[i] += v[i] * 1.0;
    }

    // Sumar ratings altos con peso proporcional (4→0.6, 5→0.8)
    for (const row of ratingRows as any[]) {
      const weight = (row.rating - 3) * 0.4; // 4→0.4, 4.5→0.6, 5→0.8
      const v = this.parseVector(row.embedding);
      for (let i = 0; i < DIM; i++) profile[i] += v[i] * weight;
    }

    // Restar dislikes con peso -1.0 (aleja el perfil de ese contenido)
    for (const row of dislikeRows as any[]) {
      const v = this.parseVector(row.embedding);
      for (let i = 0; i < DIM; i++) profile[i] -= v[i] * 1.0;
    }

    // Normalizar el vector resultante (L2 norm)
    return this.normalizeVector(profile);
  }

  // ─── Búsqueda KNN ────────────────────────────────────────────────────────

  /**
   * Busca los N contenidos más similares al vector de perfil,
   * excluyendo los IDs indicados. Usa el índice HNSW automáticamente.
   */
  async findSimilarContent(
    profileVector: number[],
    excludeIds: number[],
    limit = 20,
  ): Promise<Array<{ id: number; title: string; similarity: number }>> {
    const vectorStr = `[${profileVector.join(',')}]`;

    // Prisma $queryRaw no soporta arrays dinámicos bien, usamos string interpolation segura
    const excludeClause =
      excludeIds.length > 0
        ? `AND id NOT IN (${excludeIds.map((id) => parseInt(String(id))).join(',')})`
        : '';

    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT id, title,
              1 - (embedding <=> '${vectorStr}'::vector) AS similarity
       FROM "Tmdb"
       WHERE embedding IS NOT NULL
       ${excludeClause}
       ORDER BY embedding <=> '${vectorStr}'::vector
       LIMIT ${limit}`,
    ) as Array<{ id: number; title: string; similarity: number }>;

    return rows;
  }

  // ─── Helpers privados ────────────────────────────────────────────────────

  private buildEmbeddingText(tmdb: {
    title: string;
    overview?: string | null;
    mediaType: string;
    genreIds?: number[];
  }): string {
    const parts = [
      `Título: ${tmdb.title}`,
      `Tipo: ${tmdb.mediaType === 'movie' ? 'Película' : 'Serie'}`,
    ];
    if (tmdb.overview) parts.push(`Sinopsis: ${tmdb.overview}`);
    return parts.join('. ');
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  private async saveEmbedding(tmdbId: number, vector: number[]): Promise<void> {
    const vectorStr = `[${vector.join(',')}]`;
    await this.prisma.$executeRaw`
      UPDATE "Tmdb"
      SET embedding = ${vectorStr}::vector
      WHERE id = ${tmdbId}
    `;
  }

  private parseVector(raw: string): number[] {
    return raw
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map(Number);
  }

  private normalizeVector(v: number[]): number[] {
    const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    if (norm === 0) return v;
    return v.map((x) => x / norm);
  }
}

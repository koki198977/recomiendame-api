import { Injectable, Logger } from '@nestjs/common';
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

  /**
   * Genera el embedding de un contenido (película/serie) a partir de su metadata
   * y lo persiste en la columna `embedding` del modelo Tmdb.
   */
  async generateAndSaveEmbedding(tmdbId: number): Promise<void> {
    const tmdb = await this.prisma.tmdb.findUnique({ where: { id: tmdbId } });
    if (!tmdb) {
      this.logger.warn(`Tmdb ${tmdbId} no encontrado, saltando embedding`);
      return;
    }

    // Si ya tiene embedding, no recalcular
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

  /**
   * Calcula el vector promedio de los favoritos de un usuario (perfil vectorial).
   * Retorna null si el usuario no tiene favoritos con embedding.
   */
  async getUserProfileVector(userId: string): Promise<number[] | null> {
    const rows = await this.prisma.$queryRaw<Array<{ embedding: string }>>`
      SELECT t.embedding::text
      FROM "Favorite" f
      JOIN "Tmdb" t ON t.id = f."tmdbId"
      WHERE f."userId" = ${userId}
        AND t.embedding IS NOT NULL
    `;

    if (rows.length === 0) return null;

    const vectors = rows.map((r) => this.parseVector(r.embedding));
    return this.averageVectors(vectors);
  }

  /**
   * Busca los N contenidos más similares al vector de perfil del usuario,
   * excluyendo los IDs indicados.
   */
  async findSimilarContent(
    profileVector: number[],
    excludeIds: number[],
    limit = 20,
  ): Promise<Array<{ id: number; title: string; similarity: number }>> {
    const vectorStr = `[${profileVector.join(',')}]`;
    const excludeList = excludeIds.length > 0 ? excludeIds : [-1];

    const rows = await this.prisma.$queryRaw<
      Array<{ id: number; title: string; similarity: number }>
    >`
      SELECT id, title,
             1 - (embedding <=> ${vectorStr}::vector) AS similarity
      FROM "Tmdb"
      WHERE embedding IS NOT NULL
        AND id NOT IN (${excludeList.join(',')})
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `;

    return rows;
  }

  // ─── helpers privados ────────────────────────────────────────────────────────

  private buildEmbeddingText(tmdb: {
    title: string;
    overview?: string | null;
    mediaType: string;
    genreIds: number[];
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

  private averageVectors(vectors: number[][]): number[] {
    const dim = vectors[0].length;
    const sum = new Array(dim).fill(0);
    for (const v of vectors) {
      for (let i = 0; i < dim; i++) sum[i] += v[i];
    }
    return sum.map((x) => x / vectors.length);
  }
}

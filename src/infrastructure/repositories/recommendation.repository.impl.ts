import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationRepository } from 'src/application/ports/recommendation.repository';
import { Recommendation } from 'src/domain/entities/recommendation';
import { Tmdb } from 'src/domain/entities/tmdb';

@Injectable()
export class RecommendationRepositoryImpl implements RecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(recommendation: Recommendation): Promise<void> {
    await this.prisma.recommendation.create({
      data: {
        id: recommendation.id,
        userId: recommendation.userId,
        tmdbId: recommendation.tmdbId,
        reason: recommendation.reason,
        createdAt: recommendation.createdAt
      },
    });
  }

  

  async findAllByUser(userId: string): Promise<Recommendation[]> {
    const recs = await this.prisma.recommendation.findMany({
      where: { userId },
      include: { tmdb: true },
      orderBy: { createdAt: 'desc' },
    });

    return recs.map((r) => new Recommendation(r.id, r.userId, r.tmdbId, r.reason, r.createdAt));
  }

  async findLatestByUser(userId: string, take = 5): Promise<Recommendation[]> {
    const results = await this.prisma.recommendation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        tmdb: true,
      },
    });

    return results.map((r) => {
      const tmdb = r.tmdb
        ? new Tmdb(
            r.tmdb.id,
            r.tmdb.title,
            r.tmdb.createdAt,
            r.tmdb.posterUrl ?? undefined,
            r.tmdb.overview ?? undefined,
            r.tmdb.releaseDate ?? undefined,
            r.tmdb.genreIds,
            r.tmdb.popularity ?? 0,
            r.tmdb.voteAverage ?? 0,
            r.tmdb.mediaType as 'movie' | 'tv',
            r.tmdb.platforms ?? [],
            r.tmdb.trailerUrl ?? undefined,
          )
        : undefined;

      return new Recommendation(
        r.id,
        r.userId,
        r.tmdbId,
        r.reason,
        r.createdAt,
        tmdb,
      );
    });

  }

}

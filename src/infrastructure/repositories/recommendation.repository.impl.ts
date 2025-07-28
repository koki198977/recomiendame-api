import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationRepository } from 'src/application/ports/recommendation.repository';
import { Recommendation } from 'src/domain/entities/recommendation';

@Injectable()
export class RecommendationRepositoryImpl implements RecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(recommendation: Recommendation): Promise<void> {
    await this.prisma.recommendation.create({
      data: {
        id: recommendation.id,
        userId: recommendation.userId,
        tmdbId: recommendation.tmdbId,
        title: recommendation.title,
        reason: recommendation.reason,
        createdAt: recommendation.createdAt,
        posterUrl: recommendation.posterUrl,
        overview: recommendation.overview,
        releaseDate: recommendation.releaseDate,
        genreIds: recommendation.genreIds,
        popularity: recommendation.popularity,
        voteAverage: recommendation.voteAverage,
        mediaType: recommendation.mediaType,
      },
    });
  }

  

  async findAllByUser(userId: string): Promise<Recommendation[]> {
    const recs = await this.prisma.recommendation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return recs.map((r) => new Recommendation(r.id, r.userId, r.tmdbId, r.title, r.reason, r.createdAt));
  }

  async findLatestByUser(userId: string, limit: number = 1): Promise<Recommendation[]> {
    const records = await this.prisma.recommendation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map(
        (r) => new Recommendation(r.id, r.userId, r.tmdbId, r.title, r.reason, r.createdAt, r.posterUrl ?? undefined),
    );
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationRepository } from 'src/application/ports/recommendation.repository';
import { Recommendation } from 'src/domain/entities/recommendation';
import { Tmdb } from 'src/domain/entities/tmdb';
import { PaginatedResult } from 'src/application/dtos/paginated-result.dto';
import { ListQueryDto } from '../dtos/list-query.dto';

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

    return recs.map((r) => this.toDomain(r));
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

    return results.map((r) => this.toDomain(r));
  }

  async findPaginatedByUser(
    userId: string,
    query?: ListQueryDto,
  ): Promise<PaginatedResult<Recommendation>> {
    const {
      orderBy = 'createdAt',
      order = 'desc',
      skip = 0,
      take = 10,
      search,
      mediaType,
      platform,
    } = query || {};

    const where: any = {
      userId,
      ...(search || mediaType || platform
        ? {
            tmdb: {
              ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
              ...(mediaType ? { mediaType } : {}),
              ...(platform ? { platforms: { has: platform } } : {}),
            },
          }
        : {}),
    };

    const orderByClause =
      orderBy === 'title'
        ? { tmdb: { title: order } }
        : { createdAt: order };

    const [total, records] = await Promise.all([
      this.prisma.recommendation.count({ where }),
      this.prisma.recommendation.findMany({
        where,
        orderBy: orderByClause as any,
        skip,
        take,
        include: {
          tmdb: true,
        },
      }),
    ]);

    const items = records.map((record) => this.toDomain(record));
    const page = Math.floor(skip / take) + 1;
    const totalPages = take > 0 ? Math.ceil(total / take) : 0;
    const hasNextPage = page < totalPages;

    return new PaginatedResult<Recommendation>(
      total,
      items,
      page,
      take,
      totalPages,
      hasNextPage,
    );
  }

  private toDomain(record: any): Recommendation {
    const tmdb = record.tmdb
      ? new Tmdb(
          record.tmdb.id,
          record.tmdb.title,
          record.tmdb.createdAt,
          record.tmdb.posterUrl ?? undefined,
          record.tmdb.overview ?? undefined,
          record.tmdb.releaseDate ?? undefined,
          record.tmdb.genreIds ?? [],
          record.tmdb.popularity ?? 0,
          record.tmdb.voteAverage ?? 0,
          record.tmdb.mediaType as 'movie' | 'tv',
          record.tmdb.platforms ?? [],
          record.tmdb.trailerUrl ?? undefined,
        )
      : undefined;

    return new Recommendation(
      record.id,
      record.userId,
      record.tmdbId,
      record.reason,
      record.createdAt,
      tmdb,
    );
  }

}

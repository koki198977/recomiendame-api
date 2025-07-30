import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RatingRepository } from 'src/application/ports/rating.repository';
import { Rating } from 'src/domain/entities/rating';
import { ListQueryDto } from '../dtos/list-query.dto';
import { PaginatedResult } from 'src/application/dtos/paginated-result.dto';

@Injectable()
export class RatingRepositoryImpl implements RatingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async rate(
    userId: string,
    tmdbId: number,
    rating: number,
    comment?: string,
  ): Promise<Rating> {
    const record = await this.prisma.rating.upsert({
      where: { userId_tmdbId: { userId, tmdbId } },
      update: { rating, comment },
      create: { userId, tmdbId, rating, comment },
    });

    return new Rating(
      record.id,
      record.userId,
      record.tmdbId,
      record.rating,
      record.comment,
      record.createdAt,
    );
  }


  async getRatingsByUser(userId: string, query?: ListQueryDto): Promise<PaginatedResult<Rating>> {
    const { orderBy, skip = 0, take = 10 } = query || {};

    const where = {
      userId,
    };

    const [total, records] = await Promise.all([
      this.prisma.rating.count({ where }),
      this.prisma.rating.findMany({
        where,
        orderBy: {
          [orderBy === 'title' ? 'title' : 'createdAt']: 'desc',
        },
        skip,
        take,
        include: {
          tmdb: true,
        },
      }),
    ]);

    const items = records.map(
      (r) =>
        new Rating(
          r.id,
          r.userId,
          r.tmdbId,
          r.rating,
          r.comment,
          r.createdAt,
        ),
    );

    const page = Math.floor(skip / take) + 1;
    const totalPages = Math.ceil(total / take);
    const hasNextPage = page < totalPages;

    return new PaginatedResult<Rating>(
      total,
      items,
      page,
      take,
      totalPages,
      hasNextPage,
    );
  }


  async getRating(userId: string, tmdbId: number): Promise<Rating | null> {
    const record = await this.prisma.rating.findUnique({
      where: { userId_tmdbId: { userId, tmdbId } },
    });

    if (!record) return null;

    return new Rating(
      record.id,
      record.userId,
      record.tmdbId,
      record.rating,
      record.comment,
      record.createdAt,
    );
  }

  async removeRating(userId: string, tmdbId: number): Promise<void> {
    await this.prisma.rating.delete({
      where: {
        userId_tmdbId: { userId, tmdbId },
      },
    });
  }
}

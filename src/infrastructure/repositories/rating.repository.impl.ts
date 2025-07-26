import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RatingRepository } from 'src/application/ports/rating.repository';
import { Rating } from 'src/domain/entities/rating';
import { ListQueryDto } from '../dtos/list-query.dto';

@Injectable()
export class RatingRepositoryImpl implements RatingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async rate(
    userId: string,
    tmdbId: number,
    title: string,
    mediaType: 'movie' | 'tv',
    rating: number,
    comment?: string,
  ): Promise<Rating> {
    const record = await this.prisma.rating.upsert({
      where: { userId_tmdbId: { userId, tmdbId } },
      update: { rating, comment, title, mediaType },
      create: { userId, tmdbId, title, mediaType, rating, comment },
    });

    return new Rating(
      record.id,
      record.userId,
      record.tmdbId,
      record.title,
      record.mediaType as 'movie' | 'tv',
      record.rating,
      record.comment,
      record.createdAt,
    );
  }

  async getRatingsByUser(userId: string, query?: ListQueryDto): Promise<Rating[]> {
    const { mediaType, orderBy } = query || {};

    const records = await this.prisma.rating.findMany({
      where: {
        userId,
        ...(mediaType ? { mediaType } : {}),
      },
      orderBy: {
        [orderBy === 'title' ? 'title' : 'createdAt']: 'desc',
      },
    });

    return records.map(
      (r) =>
        new Rating(
          r.id,
          r.userId,
          r.tmdbId,
          r.title,
          r.mediaType as 'movie' | 'tv',
          r.rating,
          r.comment,
          r.createdAt,
        ),
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
      record.title,
      record.mediaType as 'movie' | 'tv',
      record.rating,
      record.comment,
      record.createdAt,
    );
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RatingRepository } from 'src/application/ports/rating.repository';
import { Rating } from 'src/domain/entities/rating';

@Injectable()
export class RatingRepositoryImpl implements RatingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async rate(
    userId: string,
    tmdbId: number,
    title: string,
    rating: number,
    comment?: string,
  ): Promise<Rating> {
    const record = await this.prisma.rating.upsert({
      where: { userId_tmdbId: { userId, tmdbId } },
      update: { rating, comment, title },
      create: { userId, tmdbId, rating, comment, title },
    });

    return new Rating(
      record.id,
      record.userId,
      record.tmdbId,
      record.title,
      record.rating,
      record.comment,
      record.createdAt,
    );
  }

  async getRatingsByUser(userId: string): Promise<Rating[]> {
    const records = await this.prisma.rating.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(
      (r) =>
        new Rating(
          r.id,
          r.userId,
          r.tmdbId,
          r.title,
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
      record.rating,
      record.comment,
      record.createdAt,
    );
  }
}

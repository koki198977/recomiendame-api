import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FavoriteRepository } from 'src/application/ports/favorite.repository';
import { Favorite } from 'src/domain/entities/favorite';
import { GetFavoritesQuery } from '../dtos/get-favorites.query';

@Injectable()
export class FavoriteRepositoryImpl implements FavoriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async addFavorite(userId: string, tmdbId: number, title: string, mediaType: string): Promise<Favorite> {
    const record = await this.prisma.favorite.create({
      data: {
        userId,
        tmdbId,
        title,
        mediaType,
      },
    });

    return new Favorite(
      record.id,
      record.userId,
      record.tmdbId,
      record.title,
      record.mediaType,
      record.createdAt,
    );
  }

  async removeFavorite(userId: string, tmdbId: number): Promise<void> {
    await this.prisma.favorite.delete({
      where: {
        userId_tmdbId: { userId, tmdbId },
      },
    });
  }

  async isFavorite(userId: string, tmdbId: number): Promise<boolean> {
    const record = await this.prisma.favorite.findUnique({
      where: {
        userId_tmdbId: { userId, tmdbId },
      },
    });

    return !!record;
  }

  async getFavorites(userId: string): Promise<Favorite[]> {
    return this.findAllByUser(userId);
  }

  async findAllByUser(userId: string, query?: GetFavoritesQuery): Promise<Favorite[]> {
    const where: any = { userId };
    if (query?.mediaType) {
      where.mediaType = query.mediaType;
    }

    const orderBy: any = {};
    if (query?.orderBy) {
      orderBy[query.orderBy] = query.order ?? 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const records = await this.prisma.favorite.findMany({ where, orderBy });

    return records.map((r) => new Favorite(r.id, r.userId, r.tmdbId, r.title, r.mediaType, r.createdAt));
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FavoriteRepository } from 'src/application/ports/favorite.repository';
import { Favorite } from 'src/domain/entities/favorite';

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

  async findAllByUser(userId: string): Promise<Favorite[]> {
    const records = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(
      (record) =>
        new Favorite(
          record.id,
          record.userId,
          record.tmdbId,
          record.title,
          record.mediaType,
          record.createdAt,
        ),
    );
  }
}

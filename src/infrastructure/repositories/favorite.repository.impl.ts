import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FavoriteRepository } from 'src/application/ports/favorite.repository';
import { Favorite } from 'src/domain/entities/favorite';
import { GetFavoritesQuery } from '../dtos/get-favorites.query';
import { PaginatedResult } from 'src/application/dtos/paginated-result.dto';

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

  async getFavorites(userId: string): Promise<PaginatedResult<Favorite>> {
    return this.findAllByUser(userId);
  }


  async findAllByUser(userId: string, query?: GetFavoritesQuery): Promise<PaginatedResult<Favorite>> {
    const { mediaType, orderBy, order = 'desc', skip = 0, take = 10 } = query || {};

    const where: any = { userId };
    if (mediaType) {
      where.mediaType = mediaType;
    }

    const orderByClause = {
      [orderBy || 'createdAt']: order,
    };

    const [total, records] = await Promise.all([
      this.prisma.favorite.count({ where }),
      this.prisma.favorite.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take,
      }),
    ]);

    const items = records.map(
      (r) => new Favorite(r.id, r.userId, r.tmdbId, r.title, r.mediaType, r.createdAt),
    );

    const page = Math.floor(skip / take) + 1;
    const totalPages = Math.ceil(total / take);
    const hasNextPage = page < totalPages;

    return new PaginatedResult<Favorite>(
      total,
      items,
      page,
      take,
      totalPages,
      hasNextPage,
    );
  }

}

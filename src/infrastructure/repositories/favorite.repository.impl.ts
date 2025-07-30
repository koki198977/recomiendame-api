import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FavoriteRepository } from 'src/application/ports/favorite.repository';
import { Favorite } from 'src/domain/entities/favorite';
import { GetFavoritesQuery } from '../dtos/get-favorites.query';
import { PaginatedResult } from 'src/application/dtos/paginated-result.dto';
import { Tmdb } from 'src/domain/entities/tmdb';

@Injectable()
export class FavoriteRepositoryImpl implements FavoriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async addFavorite(userId: string, tmdbId: number): Promise<Favorite> {
    const record = await this.prisma.favorite.create({
      data: {
        userId,
        tmdbId
      },
    });

    return new Favorite(
      record.id,
      record.userId,
      record.tmdbId,
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
    const {
      orderBy,
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

    const orderByClause = { [orderBy || 'createdAt']: order };

    const [total, records] = await Promise.all([
      this.prisma.favorite.count({ where }),
      this.prisma.favorite.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take,
        include: { tmdb: true },
      }),
    ]);

    const items = records.map((r) => {
      const tmdb = r.tmdb
        ? new Tmdb(
            r.tmdb.id,
            r.tmdb.title,
            r.tmdb.createdAt,
            r.tmdb.posterUrl ?? undefined,
            r.tmdb.overview ?? undefined,
            r.tmdb.releaseDate ?? undefined,
            r.tmdb.genreIds ?? [],
            r.tmdb.popularity ?? 0,
            r.tmdb.voteAverage ?? 0,
            r.tmdb.mediaType as 'movie' | 'tv',
            r.tmdb.platforms ?? [],
            r.tmdb.trailerUrl ?? undefined,
          )
        : undefined;

      return new Favorite(r.id, r.userId, r.tmdbId, r.createdAt, tmdb);
    });

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

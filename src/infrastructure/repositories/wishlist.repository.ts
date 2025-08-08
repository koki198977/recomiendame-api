import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WishListItem } from 'src/domain/entities/wishlist-item';
import { GetWishListQuery } from '../dtos/get-wishlist.query';
import { PaginatedResult } from 'src/application/dtos/paginated-result.dto';
import { Tmdb } from 'src/domain/entities/tmdb';
import { WishListRepository } from 'src/application/ports/wishlist.repository';

@Injectable()
export class WishListRepositoryImpl implements WishListRepository {
  constructor(private readonly prisma: PrismaService) {}

  async addToWishList(userId: string, tmdbId: number): Promise<WishListItem> {
    const record = await this.prisma.wishListItem.create({
      data: { userId, tmdbId },
    });

    return new WishListItem(
      record.id,
      record.userId,
      record.tmdbId,
      record.createdAt,
    );
  }

  async removeFromWishList(userId: string, tmdbId: number): Promise<void> {
    await this.prisma.wishListItem.delete({
      where: { userId_tmdbId: { userId, tmdbId } },
    });
  }

  async isInWishList(userId: string, tmdbId: number): Promise<boolean> {
    const record = await this.prisma.wishListItem.findUnique({
      where: { userId_tmdbId: { userId, tmdbId } },
    });
    return !!record;
  }

  async getWishList(userId: string): Promise<PaginatedResult<WishListItem>> {
    return this.findAllByUser(userId);
  }

  async findAllByUser(
    userId: string,
    query?: GetWishListQuery,
  ): Promise<PaginatedResult<WishListItem>> {
    const {
      orderBy = 'createdAt',
      order = 'desc',
      skip = 0,
      take = 10,
      search,
      mediaType,
      platform,
    } = query || {};

    // Build Prisma where clause
    const where: any = {
      userId,
      ...(search || mediaType || platform
        ? {
            tmdb: {
              ...(search
                ? { title: { contains: search, mode: 'insensitive' } }
                : {}),
              ...(mediaType ? { mediaType } : {}),
              ...(platform ? { platforms: { has: platform } } : {}),
            },
          }
        : {}),
    };

    const orderByClause = { [orderBy]: order };

    const [total, records] = await Promise.all([
      this.prisma.wishListItem.count({ where }),
      this.prisma.wishListItem.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take,
        include: { tmdb: true },
      }),
    ]);

    const items = records.map(r => {
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

      return new WishListItem(
        r.id,
        r.userId,
        r.tmdbId,
        r.createdAt,
        tmdb,
      );
    });

    const page = Math.floor(skip / take) + 1;
    const totalPages = Math.ceil(total / take);
    const hasNextPage = page < totalPages;

    return new PaginatedResult<WishListItem>(
      total,
      items,
      page,
      take,
      totalPages,
      hasNextPage,
    );
  }
}

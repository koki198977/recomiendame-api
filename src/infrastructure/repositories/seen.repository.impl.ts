import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SeenRepository } from '../../application/ports/seen.repository';
import { SeenItem } from '../../domain/entities/seen-item';
import { ListQueryDto } from '../dtos/list-query.dto';
import { PaginatedResult } from 'src/application/dtos/paginated-result.dto';
import { Tmdb } from 'src/domain/entities/tmdb';

@Injectable()
export class PgSeenRepository implements SeenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(item: SeenItem): Promise<void> {
    await this.prisma.seenItem.upsert({
      where: {
        userId_tmdbId: {
          userId: item.userId,
          tmdbId: item.tmdbId,
        },
      },
      update: {
        createdAt: item.createdAt,
      },
      create: {
        userId: item.userId,
        tmdbId: item.tmdbId,
        createdAt: item.createdAt      
      },
    });
  }

  async findByUser(userId: string, query?: ListQueryDto): Promise<PaginatedResult<SeenItem>> {
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

    const orderByClause = {
      [orderBy]: order,
    };

    const [total, records] = await Promise.all([
      this.prisma.seenItem.count({ where }),
      this.prisma.seenItem.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take,
        include: {
          tmdb: true,
        },
      }),
    ]);

    const items = records.map((i) => {
      const tmdb = i.tmdb
        ? new Tmdb(
            i.tmdb.id,
            i.tmdb.title,
            i.tmdb.createdAt,
            i.tmdb.posterUrl ?? undefined,
            i.tmdb.overview ?? undefined,
            i.tmdb.releaseDate ?? undefined,
            i.tmdb.genreIds ?? [],
            i.tmdb.popularity ?? 0,
            i.tmdb.voteAverage ?? 0,
            i.tmdb.mediaType as 'movie' | 'tv',
            i.tmdb.platforms ?? [],
            i.tmdb.trailerUrl ?? undefined,
          )
        : undefined;

      return new SeenItem(i.userId, i.tmdbId, i.createdAt, i.createdAt, tmdb);
    });

    const page = Math.floor(skip / take) + 1;
    const totalPages = Math.ceil(total / take);
    const hasNextPage = page < totalPages;

    return new PaginatedResult<SeenItem>(total, items, page, take, totalPages, hasNextPage);
  }



  async hasSeen(userId: string, tmdbId: number): Promise<boolean> {
    const item = await this.prisma.seenItem.findUnique({
      where: { userId_tmdbId: { userId, tmdbId } },
    });
    return !!item;
  }

  async getSeenItems(userId: string, query?: ListQueryDto): Promise<PaginatedResult<SeenItem>> {
    const { orderBy, skip = 0, take = 10 } = query || {};

    const where = {
      userId,
    };

    const orderByClause = {
      [orderBy === 'title' ? 'title' : 'tmdbId']: 'desc',
    };

    const [total, records] = await Promise.all([
      this.prisma.seenItem.count({ where }),
      this.prisma.seenItem.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take,
        include: {
          tmdb: true,
        },
      }),
    ]);

    const items = records.map(
      (i) =>
        new SeenItem(
          i.userId,
          i.tmdbId,
          i.createdAt,
        ),
    );

    const page = Math.floor(skip / take) + 1;
    const totalPages = Math.ceil(total / take);
    const hasNextPage = page < totalPages;

    return new PaginatedResult<SeenItem>(total, items, page, take, totalPages, hasNextPage);
  }

  async removeSeen(userId: string, tmdbId: number): Promise<void> {
    await this.prisma.seenItem.delete({
      where: {
        userId_tmdbId: { userId, tmdbId },
      },
    });
  }

}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SeenRepository } from '../../application/ports/seen.repository';
import { SeenItem } from '../../domain/entities/seen-item';
import { ListQueryDto } from '../dtos/list-query.dto';
import { PaginatedResult } from 'src/application/dtos/paginated-result.dto';

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
      update: {},
      create: {
        userId: item.userId,
        tmdbId: item.tmdbId,
        title: item.title,
        mediaType: item.mediaType,
      },
    });
  }

  async findByUser(userId: string, query?: ListQueryDto): Promise<PaginatedResult<SeenItem>> {
    const { mediaType, orderBy, skip = 0, take = 10 } = query || {};

    const where = {
      userId,
      ...(mediaType ? { mediaType } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.seenItem.count({ where }),
      this.prisma.seenItem.findMany({
        where,
        orderBy: {
          [orderBy === 'title' ? 'title' : 'tmdbId']: 'desc',
        },
        skip,
        take,
      }),
    ]);

    const mappedItems = items.map(
      (item) =>
        new SeenItem(
          item.userId,
          item.tmdbId,
          item.title,
          item.mediaType as 'movie' | 'tv',
          item.createdAt,
        ),
    );

    const page = Math.floor(skip / take) + 1;
    const totalPages = Math.ceil(total / take);
    const hasNextPage = page < totalPages;

    return new PaginatedResult<SeenItem>(
      total,
      mappedItems,
      page,
      take,
      totalPages,
      hasNextPage
    );
  }


  async hasSeen(userId: string, tmdbId: number): Promise<boolean> {
    const item = await this.prisma.seenItem.findUnique({
      where: { userId_tmdbId: { userId, tmdbId } },
    });
    return !!item;
  }

  async getSeenItems(userId: string, query?: ListQueryDto): Promise<PaginatedResult<SeenItem>> {
    const { mediaType, orderBy, skip = 0, take = 10 } = query || {};

    const where = {
      userId,
      ...(mediaType ? { mediaType } : {}),
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
      }),
    ]);

    const items = records.map(
      (i) =>
        new SeenItem(
          i.userId,
          i.tmdbId,
          i.title,
          i.mediaType as 'movie' | 'tv',
          i.createdAt,
        ),
    );

    const page = Math.floor(skip / take) + 1;
    const totalPages = Math.ceil(total / take);
    const hasNextPage = page < totalPages;

    return new PaginatedResult<SeenItem>(total, items, page, take, totalPages, hasNextPage);
  }

}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DislikedRepository } from '../../application/ports/disliked.repository';
import { DislikedItem } from '../../domain/entities/disliked-item';
import { PaginatedResult } from '../../application/dtos/paginated-result.dto';

@Injectable()
export class DislikedRepositoryImpl implements DislikedRepository {
  constructor(private readonly prisma: PrismaService) {}

  async addDisliked(userId: string, tmdbId: number, mediaType: string): Promise<DislikedItem> {
    const disliked = await this.prisma.dislikedItem.create({
      data: {
        userId,
        tmdbId,
        mediaType,
      },
    });

    return new DislikedItem(
      disliked.id,
      disliked.userId,
      disliked.tmdbId,
      disliked.mediaType,
      disliked.createdAt,
    );
  }

  async removeDisliked(userId: string, tmdbId: number): Promise<void> {
    await this.prisma.dislikedItem.deleteMany({
      where: {
        userId,
        tmdbId,
      },
    });
  }

  async isDisliked(userId: string, tmdbId: number): Promise<boolean> {
    const count = await this.prisma.dislikedItem.count({
      where: {
        userId,
        tmdbId,
      },
    });
    return count > 0;
  }

  async getDisliked(userId: string, take = 10, skip = 0): Promise<PaginatedResult<DislikedItem>> {
    const [items, total] = await Promise.all([
      this.prisma.dislikedItem.findMany({
        where: { userId },
        take,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.dislikedItem.count({ where: { userId } }),
    ]);

    const dislikedItems = items.map(
      (item) =>
        new DislikedItem(
          item.id,
          item.userId,
          item.tmdbId,
          item.mediaType,
          item.createdAt,
        ),
    );

    const totalPages = Math.ceil(total / take);
    const currentPage = Math.floor(skip / take) + 1;

    return new PaginatedResult(
      total,
      dislikedItems,
      currentPage,
      take,
      totalPages,
      skip + take < total,
    );
  }

  async getAllDislikedIds(userId: string): Promise<number[]> {
    const items = await this.prisma.dislikedItem.findMany({
      where: { userId },
      select: { tmdbId: true },
    });
    return items.map((item) => item.tmdbId);
  }
}

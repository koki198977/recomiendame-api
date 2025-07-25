import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SeenRepository } from '../../application/ports/seen.repository';
import { SeenItem } from '../../domain/entities/seen-item';

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

  async findByUser(userId: string): Promise<SeenItem[]> {
    const items = await this.prisma.seenItem.findMany({ where: { userId } });
    return items.map((item) => new SeenItem(item.userId, item.tmdbId, item.title, item.mediaType as 'movie' | 'tv'));
  }

  async hasSeen(userId: string, tmdbId: number): Promise<boolean> {
    const item = await this.prisma.seenItem.findUnique({
      where: { userId_tmdbId: { userId, tmdbId } },
    });
    return !!item;
  }
}

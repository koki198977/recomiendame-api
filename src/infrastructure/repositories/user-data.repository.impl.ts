import { Injectable } from '@nestjs/common';
import { UserDataRepository } from 'src/application/ports/user-data.repository';
import { SeenItem } from 'src/domain/entities/seen-item';
import { Favorite } from 'src/domain/entities/favorite';
import { Rating } from 'src/domain/entities/rating';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserDataRepositoryImpl implements UserDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSeenItems(userId: string): Promise<SeenItem[]> {
    const items = await this.prisma.seenItem.findMany({ where: { userId } });
    return items.map(i => new SeenItem(i.userId, i.tmdbId, i.title, i.mediaType as 'movie' | 'tv', i.createdAt, i.createdAt));
  }

  async getFavorites(userId: string): Promise<Favorite[]> {
    const items = await this.prisma.favorite.findMany({ where: { userId } });
    return items.map(i => new Favorite(i.id, i.userId, i.tmdbId, i.title, i.mediaType, i.createdAt));
  }

  async getRatings(userId: string): Promise<Rating[]> {
    const items = await this.prisma.rating.findMany({ where: { userId } });
    return items.map(i => new Rating(i.id, i.userId, i.tmdbId, i.title, i.mediaType as 'movie' | 'tv', i.rating, i.comment, i.createdAt));
  }
}

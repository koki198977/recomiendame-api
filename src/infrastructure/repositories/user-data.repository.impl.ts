import { Injectable } from '@nestjs/common';
import { UserDataRepository } from 'src/application/ports/user-data.repository';
import { SeenItem } from 'src/domain/entities/seen-item';
import { Favorite } from 'src/domain/entities/favorite';
import { Rating } from 'src/domain/entities/rating';
import { PrismaService } from '../prisma/prisma.service';
import { Tmdb } from 'src/domain/entities/tmdb';
import { WishListItem } from 'src/domain/entities/wishlist-item';


@Injectable()
export class UserDataRepositoryImpl implements UserDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSeenItems(userId: string): Promise<SeenItem[]> {
    const items = await this.prisma.seenItem.findMany({
      where: { userId },
      include: { tmdb: true },
    });

    return items.map(i => {
      const tmdb = i.tmdb
        ? new Tmdb(
            i.tmdb.id,
            i.tmdb.title,
            i.tmdb.createdAt,
            i.tmdb.posterUrl ?? undefined,
            i.tmdb.overview ?? undefined,
            i.tmdb.releaseDate,
            i.tmdb.genreIds ?? [],
            i.tmdb.popularity ?? undefined,
            i.tmdb.voteAverage ?? undefined,
            i.tmdb.mediaType as 'movie' | 'tv',
            i.tmdb.platforms,
            i.tmdb.trailerUrl ?? undefined,
          )
        : undefined;

      return new SeenItem(
        i.userId,
        i.tmdbId,
        i.createdAt,     // watchedAt
        i.createdAt,     // createdAt
        tmdb,            // full Tmdb object
      );
    });
  }


  async getFavorites(userId: string): Promise<Favorite[]> {
    const items = await this.prisma.favorite.findMany({
      where: { userId },
      include: { tmdb: true },
    });

    return items.map(i => {
      const tmdb = i.tmdb
        ? new Tmdb(
            i.tmdb.id,
            i.tmdb.title,
            i.tmdb.createdAt,
            i.tmdb.posterUrl ?? undefined,
            i.tmdb.overview ?? undefined,
            i.tmdb.releaseDate,
            i.tmdb.genreIds ?? [],
            i.tmdb.popularity ?? undefined,
            i.tmdb.voteAverage ?? undefined,
            i.tmdb.mediaType as 'movie' | 'tv',
            i.tmdb.platforms,
            i.tmdb.trailerUrl ?? undefined,
          )
        : undefined;

      return new Favorite(i.id, i.userId, i.tmdbId, i.createdAt, tmdb);
    });
  }


  async getRatings(userId: string): Promise<Rating[]> {
    const items = await this.prisma.rating.findMany({
      where: { userId },
      include: { tmdb: true },
    });

    return items.map(i => {
      const tmdb = i.tmdb
        ? new Tmdb(
            i.tmdb.id,
            i.tmdb.title,
            i.tmdb.createdAt,
            i.tmdb.posterUrl ?? undefined,
            i.tmdb.overview ?? undefined,
            i.tmdb.releaseDate,
            i.tmdb.genreIds ?? [],
            i.tmdb.popularity ?? undefined,
            i.tmdb.voteAverage ?? undefined,
            i.tmdb.mediaType as 'movie' | 'tv',
            i.tmdb.platforms,
            i.tmdb.trailerUrl ?? undefined,
          )
        : undefined;

      return new Rating(
        i.id,
        i.userId,
        i.tmdbId,
        i.rating,
        i.comment ?? null,
        i.createdAt,
        tmdb,
      );
    });
  }

  async getWishlist(userId: string): Promise<WishListItem[]> {
    const items = await this.prisma.wishListItem.findMany({
      where: { userId },
      include: { tmdb: true },
    });

    return items.map(i => {
      const tmdb = i.tmdb
        ? new Tmdb(
            i.tmdb.id,
            i.tmdb.title,
            i.tmdb.createdAt,
            i.tmdb.posterUrl ?? undefined,
            i.tmdb.overview ?? undefined,
            i.tmdb.releaseDate,
            i.tmdb.genreIds ?? [],
            i.tmdb.popularity ?? undefined,
            i.tmdb.voteAverage ?? undefined,
            i.tmdb.mediaType as 'movie' | 'tv',
            i.tmdb.platforms,
            i.tmdb.trailerUrl ?? undefined,
          )
        : undefined;

      return new WishListItem(
        i.id,
        i.userId,
        i.tmdbId,
        i.createdAt,
        tmdb,
      );
    });
  }

}

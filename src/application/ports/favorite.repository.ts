import { Favorite } from '../../domain/entities/favorite';

export const FAVORITE_REPOSITORY = Symbol('FAVORITE_REPOSITORY');

export interface FavoriteRepository {
  addFavorite(userId: string, tmdbId: number, title: string, mediaType: string): Promise<Favorite>;
  removeFavorite(userId: string, tmdbId: number): Promise<void>;
  isFavorite(userId: string, tmdbId: number): Promise<boolean>;
  getFavorites(userId: string): Promise<Favorite[]>;
  findAllByUser(userId: string): Promise<Favorite[]>;
}

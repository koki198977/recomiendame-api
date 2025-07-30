import { GetFavoritesQuery } from 'src/infrastructure/dtos/get-favorites.query';
import { Favorite } from '../../domain/entities/favorite';
import { PaginatedResult } from '../dtos/paginated-result.dto';

export const FAVORITE_REPOSITORY = Symbol('FAVORITE_REPOSITORY');

export interface FavoriteRepository {
  addFavorite(userId: string, tmdbId: number): Promise<Favorite>;
  removeFavorite(userId: string, tmdbId: number): Promise<void>;
  isFavorite(userId: string, tmdbId: number): Promise<boolean>;
  getFavorites(userId: string): Promise<PaginatedResult<Favorite>>;
  findAllByUser(userId: string, query?: GetFavoritesQuery): Promise<PaginatedResult<Favorite>>;
}

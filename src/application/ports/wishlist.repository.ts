import { GetWishListQuery } from 'src/infrastructure/dtos/get-wishlist.query';
import { WishListItem } from '../../domain/entities/wishlist-item';
import { PaginatedResult } from '../dtos/paginated-result.dto';

export const WISHLIST_REPOSITORY = Symbol('WISHLIST_REPOSITORY');

export interface WishListRepository {
  addToWishList(userId: string, tmdbId: number): Promise<WishListItem>;
  removeFromWishList(userId: string, tmdbId: number): Promise<void>;
  isInWishList(userId: string, tmdbId: number): Promise<boolean>;
  getWishList(userId: string): Promise<PaginatedResult<WishListItem>>;
  findAllByUser(
    userId: string,
    query?: GetWishListQuery,
  ): Promise<PaginatedResult<WishListItem>>;
}

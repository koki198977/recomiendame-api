import { Inject, Injectable } from '@nestjs/common';
import { WishListItem } from '../../domain/entities/wishlist-item';
import { GetWishListQuery } from 'src/infrastructure/dtos/get-wishlist.query';
import { PaginatedResult } from '../dtos/paginated-result.dto';
import { WISHLIST_REPOSITORY, WishListRepository } from '../ports/wishlist.repository';

@Injectable()
export class GetWishListUseCase {
  constructor(
    @Inject(WISHLIST_REPOSITORY)
    private readonly wishListRepository: WishListRepository,
  ) {}

  async execute(
    userId: string,
    query?: GetWishListQuery,
  ): Promise<PaginatedResult<WishListItem>> {
    return this.wishListRepository.findAllByUser(userId, query);
  }
}

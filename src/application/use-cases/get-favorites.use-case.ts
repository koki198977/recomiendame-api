import { Inject, Injectable } from '@nestjs/common';
import { FAVORITE_REPOSITORY, FavoriteRepository } from '../ports/favorite.repository';
import { Favorite } from 'src/domain/entities/favorite';
import { GetFavoritesQuery } from 'src/infrastructure/dtos/get-favorites.query';
import { PaginatedResult } from '../dtos/paginated-result.dto';

@Injectable()
export class GetFavoritesUseCase {
  constructor(
    @Inject(FAVORITE_REPOSITORY)
    private readonly favoriteRepository: FavoriteRepository,
  ) {}

  async execute(userId: string, query?: GetFavoritesQuery): Promise<PaginatedResult<Favorite>> {
    return this.favoriteRepository.findAllByUser(userId, query);
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FavoriteRepository, FAVORITE_REPOSITORY } from '../ports/favorite.repository';

@Injectable()
export class RemoveFavoriteUseCase {
  constructor(
    @Inject(FAVORITE_REPOSITORY)
    private readonly favoriteRepo: FavoriteRepository,
  ) {}

  async execute(userId: string, tmdbId: number): Promise<void> {
    const isFavorite = await this.favoriteRepo.isFavorite(userId, tmdbId);

    if (!isFavorite) {
      throw new NotFoundException('El contenido no está en favoritos');
    }

    await this.favoriteRepo.removeFavorite(userId, tmdbId);
  }
}

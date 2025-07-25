import { Inject, Injectable } from '@nestjs/common';
import { Favorite } from '../../domain/entities/favorite';
import { FavoriteRepository, FAVORITE_REPOSITORY } from '../ports/favorite.repository';

@Injectable()
export class AddFavoriteUseCase {
  constructor(
    @Inject(FAVORITE_REPOSITORY)
    private readonly favoriteRepo: FavoriteRepository,
  ) {}

  async execute(
    userId: string,
    tmdbId: number,
    title: string,
    mediaType: string,
  ): Promise<Favorite> {
    const isAlreadyFavorite = await this.favoriteRepo.isFavorite(userId, tmdbId);
    if (isAlreadyFavorite) {
      throw new Error('Este contenido ya está marcado como favorito');
    }

    return this.favoriteRepo.addFavorite(userId, tmdbId, title, mediaType);
  }
}

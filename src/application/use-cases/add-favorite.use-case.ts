import { Inject, Injectable } from '@nestjs/common';
import { Favorite } from '../../domain/entities/favorite';
import { FavoriteRepository, FAVORITE_REPOSITORY } from '../ports/favorite.repository';
import { ACTIVITY_LOG_REPOSITORY, ActivityLogRepository } from '../ports/activity-log.repository';
import { ActivityLog } from 'src/domain/entities/activity-log';

@Injectable()
export class AddFavoriteUseCase {
  constructor(
    @Inject(FAVORITE_REPOSITORY)
    private readonly favoriteRepo: FavoriteRepository,

    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityRepo: ActivityLogRepository,
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

    const favorite = await this.favoriteRepo.addFavorite(userId, tmdbId, title, mediaType);

    await this.activityRepo.log(
      new ActivityLog(
        undefined,
        userId,
        'added_favorite',
        tmdbId,
        title,
        mediaType,
        undefined,
        new Date()
      )
    );

    return favorite;
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FavoriteRepository, FAVORITE_REPOSITORY } from '../ports/favorite.repository';
import { ACTIVITY_LOG_REPOSITORY, ActivityLogRepository } from '../ports/activity-log.repository';
import { ActivityLog } from 'src/domain/entities/activity-log';

@Injectable()
export class RemoveFavoriteUseCase {
  constructor(
    @Inject(FAVORITE_REPOSITORY)
    private readonly favoriteRepo: FavoriteRepository,

    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityRepo: ActivityLogRepository,
  ) {}

  async execute(userId: string, tmdbId: number): Promise<void> {
    const isFavorite = await this.favoriteRepo.isFavorite(userId, tmdbId);

    if (!isFavorite) {
      throw new NotFoundException('El contenido no está en favoritos');
    }

    // Obtener el favorito antes de eliminarlo, para poder registrar el título y mediaType
    const result = await this.favoriteRepo.findAllByUser(userId);
    const item = result.items.find((f) => f.tmdbId === tmdbId);

    await this.favoriteRepo.removeFavorite(userId, tmdbId);

    // Registrar en el historial solo si se encontró el item
    if (item) {
      await this.activityRepo.log(
        new ActivityLog(
          undefined,
          userId,
          'removed_favorite',
          tmdbId,
          item.title,
          item.mediaType,
          undefined,
          new Date()
        )
      );
    }
  }
}

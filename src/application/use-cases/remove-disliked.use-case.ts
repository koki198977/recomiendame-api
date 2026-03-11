import { Inject, Injectable } from '@nestjs/common';
import {
  DislikedRepository,
  DISLIKED_REPOSITORY,
} from '../ports/disliked.repository';
import {
  ACTIVITY_LOG_REPOSITORY,
  ActivityLogRepository,
} from '../ports/activity-log.repository';
import { ActivityLog } from 'src/domain/entities/activity-log';

@Injectable()
export class RemoveDislikedUseCase {
  constructor(
    @Inject(DISLIKED_REPOSITORY)
    private readonly dislikedRepo: DislikedRepository,

    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityRepo: ActivityLogRepository,
  ) {}

  async execute(userId: string, tmdbId: number): Promise<void> {
    const isDisliked = await this.dislikedRepo.isDisliked(userId, tmdbId);
    if (!isDisliked) {
      throw new Error('Este contenido no está en la lista de descartados');
    }

    await this.dislikedRepo.removeDisliked(userId, tmdbId);

    await this.activityRepo.log(
      new ActivityLog(
        undefined,
        userId,
        'removed_disliked',
        tmdbId,
        undefined,
        new Date(),
      )
    );
  }
}

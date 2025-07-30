import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FAVORITE_REPOSITORY } from '../ports/favorite.repository';
import { ACTIVITY_LOG_REPOSITORY, ActivityLogRepository } from '../ports/activity-log.repository';
import { ActivityLog } from 'src/domain/entities/activity-log';
import { SeenRepository, SeenRepositoryToken } from '../ports/seen.repository';

@Injectable()
export class RemoveSeenUseCase {
  constructor(
    @Inject(SeenRepositoryToken)
    private readonly seenRepo: SeenRepository,

    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityRepo: ActivityLogRepository,
  ) {}

  async execute(userId: string, tmdbId: number): Promise<void> {
    const isSeen = await this.seenRepo.hasSeen(userId, tmdbId);

    if (!isSeen) {
      throw new NotFoundException('El contenido no está en vistos');
    }

    const result = await this.seenRepo.findByUser(userId);
    const item = result.items.find((f) => f.tmdbId === tmdbId);

    await this.seenRepo.removeSeen(userId, tmdbId);

    if (item) {
      await this.activityRepo.log(
        new ActivityLog(
          undefined,
          userId,
          'removed_seen',
          tmdbId,
          undefined,
          new Date()
        )
      );
    }
  }
}

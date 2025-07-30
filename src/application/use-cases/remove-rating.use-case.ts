import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ACTIVITY_LOG_REPOSITORY, ActivityLogRepository } from '../ports/activity-log.repository';
import { ActivityLog } from 'src/domain/entities/activity-log';
import { RATING_REPOSITORY, RatingRepository } from '../ports/rating.repository';

@Injectable()
export class RemoveRatingUseCase {
  constructor(
    @Inject(RATING_REPOSITORY)
    private readonly ratingRepo: RatingRepository,

    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityRepo: ActivityLogRepository,
  ) {}

  async execute(userId: string, tmdbId: number): Promise<void> {
    const isRating = await this.ratingRepo.getRating(userId, tmdbId);

    if (!isRating) {
      throw new NotFoundException('No existe rating para este contenido');
    }

    const result = await this.ratingRepo.getRatingsByUser(userId);
    const item = result.items.find((f) => f.tmdbId === tmdbId);

    await this.ratingRepo.removeRating(userId, tmdbId);

    if (item) {
      await this.activityRepo.log(
        new ActivityLog(
          undefined,
          userId,
          'removed_rating',
          tmdbId,
          undefined,
          new Date()
        )
      );
    }
  }
}

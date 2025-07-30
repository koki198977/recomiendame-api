import { Inject, Injectable } from '@nestjs/common';
import { RatingRepository, RATING_REPOSITORY } from '../ports/rating.repository';
import { ActivityLog } from 'src/domain/entities/activity-log';
import {
  ACTIVITY_LOG_REPOSITORY,
  ActivityLogRepository,
} from '../ports/activity-log.repository';

@Injectable()
export class RateItemUseCase {
  constructor(
    @Inject(RATING_REPOSITORY)
    private readonly ratingRepo: RatingRepository,

    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityRepo: ActivityLogRepository,
  ) {}

  async execute(
    userId: string,
    tmdbId: number,
    rating: number,
    comment?: string,
  ) {

    const rated = await this.ratingRepo.rate(
      userId,
      tmdbId,
      rating,
      comment,
    );

    await this.activityRepo.log(
      new ActivityLog(
        undefined,
        userId,
        'rated',
        tmdbId,
        comment,
        new Date(),
      ),
    );

    return rated;
  }
}

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
    title: string,
    mediaType: 'movie' | 'tv',
    rating: number,
    comment?: string,
  ) {

    if (mediaType !== 'movie' && mediaType !== 'tv') {
        throw new Error('mediaType debe ser "movie" o "tv"');
    }
    const rated = await this.ratingRepo.rate(
      userId,
      tmdbId,
      title,
      mediaType,
      rating,
      comment,
    );

    await this.activityRepo.log(
      new ActivityLog(
        undefined,
        userId,
        'rated',
        tmdbId,
        title,
        mediaType,
        comment,
        new Date(),
      ),
    );

    return rated;
  }
}

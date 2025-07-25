import { Inject, Injectable } from '@nestjs/common';
import { RATING_REPOSITORY, RatingRepository } from '../ports/rating.repository';

@Injectable()
export class GetUserRatingsUseCase {
  constructor(
    @Inject(RATING_REPOSITORY)
    private readonly ratingRepo: RatingRepository,
  ) {}

  async execute(userId: string) {
    return this.ratingRepo.getRatingsByUser(userId);
  }
}

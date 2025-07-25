import { Inject, Injectable } from '@nestjs/common';
import { RatingRepository, RATING_REPOSITORY } from '../ports/rating.repository';

@Injectable()
export class RateItemUseCase {
  constructor(
    @Inject(RATING_REPOSITORY)
    private readonly ratingRepo: RatingRepository,
  ) {}

  async execute(userId: string, tmdbId: number, title: string, rating: number, comment?: string) {
    return this.ratingRepo.rate(userId, tmdbId, title, rating, comment);
  }
}

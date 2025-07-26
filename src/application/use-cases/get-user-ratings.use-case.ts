import { Inject, Injectable } from '@nestjs/common';
import { RATING_REPOSITORY, RatingRepository } from '../ports/rating.repository';
import { ListQueryDto } from 'src/infrastructure/dtos/list-query.dto';
import { Rating } from 'src/domain/entities/rating';

@Injectable()
export class GetUserRatingsUseCase {
  constructor(
    @Inject(RATING_REPOSITORY)
    private readonly ratingRepo: RatingRepository,
  ) {}

  async execute(userId: string, query?: ListQueryDto): Promise<Rating[]> {
    return this.ratingRepo.getRatingsByUser(userId, query);
  }
}

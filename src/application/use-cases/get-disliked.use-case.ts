import { Inject, Injectable } from '@nestjs/common';
import {
  DislikedRepository,
  DISLIKED_REPOSITORY,
} from '../ports/disliked.repository';
import { PaginatedResult } from '../dtos/paginated-result.dto';
import { DislikedItem } from '../../domain/entities/disliked-item';

@Injectable()
export class GetDislikedUseCase {
  constructor(
    @Inject(DISLIKED_REPOSITORY)
    private readonly dislikedRepo: DislikedRepository,
  ) {}

  async execute(
    userId: string,
    take = 10,
    skip = 0,
  ): Promise<PaginatedResult<DislikedItem>> {
    return this.dislikedRepo.getDisliked(userId, take, skip);
  }
}

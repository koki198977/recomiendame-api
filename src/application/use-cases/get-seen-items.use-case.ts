import { Inject, Injectable } from '@nestjs/common';
import { SeenRepository, SeenRepositoryToken } from '../ports/seen.repository';
import { SeenItem } from '../../domain/entities/seen-item';
import { ListQueryDto } from 'src/infrastructure/dtos/list-query.dto';
import { PaginatedResult } from '../dtos/paginated-result.dto';

@Injectable()
export class GetSeenItemsUseCase {
  constructor(
    @Inject(SeenRepositoryToken)
    private readonly seenRepo: SeenRepository
  ) {}

  async execute(userId: string, query?: ListQueryDto): Promise<PaginatedResult<SeenItem>> {
    return this.seenRepo.findByUser(userId, query);
  }
}
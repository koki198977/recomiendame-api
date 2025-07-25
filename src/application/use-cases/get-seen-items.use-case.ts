import { Inject, Injectable } from '@nestjs/common';
import { SeenRepository, SeenRepositoryToken } from '../ports/seen.repository';
import { SeenItem } from '../../domain/entities/seen-item';

@Injectable()
export class GetSeenItemsUseCase {
  constructor(
    @Inject(SeenRepositoryToken)
    private readonly seenRepo: SeenRepository
  ) {}

  async execute(userId: string): Promise<SeenItem[]> {
    return this.seenRepo.findByUser(userId);
  }
}
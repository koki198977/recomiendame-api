import { Inject, Injectable } from '@nestjs/common';
import { SeenRepository, SeenRepositoryToken } from '../ports/seen.repository';
import { SeenItem } from 'src/domain/entities/seen-item';

@Injectable()
export class MarkSeenUseCase {
  constructor(
    @Inject(SeenRepositoryToken)
    private readonly seenRepo: SeenRepository
  ) {}

  async execute(input: {
    userId: string;
    tmdbId: number;
    title: string;
    mediaType: 'movie' | 'tv';
  }): Promise<void> {
    const seenItem = new SeenItem(
      input.userId,
      input.tmdbId,
      input.title,
      input.mediaType,
    );
    await this.seenRepo.save(seenItem);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { SeenRepository, SeenRepositoryToken } from '../ports/seen.repository';
import { ACTIVITY_LOG_REPOSITORY, ActivityLogRepository } from '../ports/activity-log.repository';
import { SeenItem } from 'src/domain/entities/seen-item';
import { ActivityLog } from 'src/domain/entities/activity-log';
import cuid = require('cuid');
import { TmdbService } from 'src/infrastructure/tmdb/tmdb.service';

@Injectable()
export class MarkSeenUseCase {
  constructor(
    @Inject(SeenRepositoryToken)
    private readonly seenRepo: SeenRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityLogRepo: ActivityLogRepository,
    private readonly tmdbService: TmdbService, 
  ) {}

  async execute(input: {
    userId: string;
    tmdbId: number;
    title: string;
    mediaType: 'movie' | 'tv';
  }): Promise<void> {
    const posterUrl = await this.tmdbService.getPoster(input.tmdbId, input.mediaType as 'movie' | 'tv');
    const seenItem = new SeenItem(
      input.userId,
      input.tmdbId,
      input.title,
      input.mediaType,
      new Date(),
      new Date(),
      posterUrl ?? undefined
    );
    
    await this.seenRepo.save(seenItem);
    const id = cuid();
    await this.activityLogRepo.log(
      new ActivityLog(
        id,
        input.userId,
        'seen',
        input.tmdbId,
        input.title,
        input.mediaType
      )
    );
  }
}

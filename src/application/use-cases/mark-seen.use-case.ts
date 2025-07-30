import { Inject, Injectable } from '@nestjs/common';
import { SeenRepository, SeenRepositoryToken } from '../ports/seen.repository';
import { ACTIVITY_LOG_REPOSITORY, ActivityLogRepository } from '../ports/activity-log.repository';
import { SeenItem } from 'src/domain/entities/seen-item';
import { ActivityLog } from 'src/domain/entities/activity-log';
import cuid from 'cuid';
import { TmdbService } from 'src/infrastructure/tmdb/tmdb.service';
import { TMDB_REPOSITORY, TmdbRepository } from '../ports/tmdb.repository';
import { Tmdb } from 'src/domain/entities/tmdb';

@Injectable()
export class MarkSeenUseCase {
  constructor(
    @Inject(SeenRepositoryToken)
    private readonly seenRepo: SeenRepository,

    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityLogRepo: ActivityLogRepository,

    private readonly tmdbService: TmdbService,

    @Inject(TMDB_REPOSITORY)
    private readonly tmdbRepo: TmdbRepository,
  ) {}

  async execute(input: { userId: string; tmdbId: number, mediaType: 'movie' | 'tv', }): Promise<void> {
    const { userId, tmdbId, mediaType } = input;

    const alreadySeen = await this.seenRepo.hasSeen(userId, tmdbId);
    if (alreadySeen) {
      throw new Error('Este contenido ya está marcado como visto');
    }

    // 2) Asegurar que existe el Tmdb en BD
    const existingTmdb = await this.tmdbRepo.findById(tmdbId);
    if (!existingTmdb) {
      const details = await this.tmdbService.getDetails(tmdbId, mediaType);
      await this.tmdbRepo.save(
        new Tmdb(
          details.id,
          details.title,
          new Date(),
          details.posterUrl,
          details.overview,
          details.releaseDate ? new Date(details.releaseDate) : null,
          details.genreIds,
          details.popularity,
          details.voteAverage,
          details.mediaType,
          details.platforms,
          details.trailerUrl,
        )
      );
    }

    const seenItem = new SeenItem(
      userId,
      tmdbId,
      new Date(),
      new Date(),
    );
    await this.seenRepo.save(seenItem);

    await this.activityLogRepo.log(
      new ActivityLog(
        cuid(),
        userId,
        'seen',
        tmdbId,
        undefined,
        new Date(),
      )
    );
  }
}

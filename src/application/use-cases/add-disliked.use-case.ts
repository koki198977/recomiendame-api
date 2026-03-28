import { Inject, Injectable } from '@nestjs/common';
import { DislikedItem } from '../../domain/entities/disliked-item';
import {
  DislikedRepository,
  DISLIKED_REPOSITORY,
} from '../ports/disliked.repository';
import {
  ACTIVITY_LOG_REPOSITORY,
  ActivityLogRepository,
} from '../ports/activity-log.repository';
import { ActivityLog } from 'src/domain/entities/activity-log';
import { TmdbService } from 'src/infrastructure/tmdb/tmdb.service';
import { TMDB_REPOSITORY, TmdbRepository } from '../ports/tmdb.repository';
import { Tmdb } from 'src/domain/entities/tmdb';
import { EmbeddingsService } from 'src/infrastructure/ai/embeddings.service';

@Injectable()
export class AddDislikedUseCase {
  constructor(
    @Inject(DISLIKED_REPOSITORY)
    private readonly dislikedRepo: DislikedRepository,

    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityRepo: ActivityLogRepository,

    private readonly tmdbService: TmdbService,

    @Inject(TMDB_REPOSITORY)
    private readonly tmdbRepo: TmdbRepository,

    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async execute(
    userId: string,
    tmdbId: number,
    mediaType: 'movie' | 'tv',
  ): Promise<DislikedItem> {
    // Verify user exists
    const user = await this.tmdbRepo.findById; // This will be checked by Prisma
    
    const isAlreadyDisliked = await this.dislikedRepo.isDisliked(userId, tmdbId);
    if (isAlreadyDisliked) {
      throw new Error('Este contenido ya está marcado como descartado');
    }

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
          details.releaseDate ? new Date(details.releaseDate) : undefined,
          details.genreIds,
          details.popularity,
          details.voteAverage,
          details.mediaType,
          details.platforms,
          details.trailerUrl,
        )
      );
    }

    try {
      const disliked = await this.dislikedRepo.addDisliked(userId, tmdbId, mediaType);

      await this.activityRepo.log(
        new ActivityLog(
          undefined,
          userId,
          'added_disliked',
          tmdbId,
          undefined,
          new Date(),
        )
      );

      // Generar embedding en background (no bloquea la respuesta)
      this.embeddingsService.generateAndSaveEmbedding(tmdbId).catch(() => {});

      return disliked;
    } catch (error) {
      if (error.code === 'P2003') {
        throw new Error('Usuario no encontrado. Por favor, inicia sesión nuevamente.');
      }
      throw error;
    }
  }
}

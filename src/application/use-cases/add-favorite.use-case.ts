import { Inject, Injectable } from '@nestjs/common';
import { Favorite } from '../../domain/entities/favorite';
import {
  FavoriteRepository,
  FAVORITE_REPOSITORY,
} from '../ports/favorite.repository';
import {
  ACTIVITY_LOG_REPOSITORY,
  ActivityLogRepository,
} from '../ports/activity-log.repository';
import { ActivityLog } from 'src/domain/entities/activity-log';
import { TmdbService } from 'src/infrastructure/tmdb/tmdb.service';
import { TMDB_REPOSITORY, TmdbRepository } from '../ports/tmdb.repository';
import { Tmdb } from 'src/domain/entities/tmdb';

@Injectable()
export class AddFavoriteUseCase {
  constructor(
    @Inject(FAVORITE_REPOSITORY)
    private readonly favoriteRepo: FavoriteRepository,

    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityRepo: ActivityLogRepository,

    private readonly tmdbService: TmdbService,

    @Inject(TMDB_REPOSITORY)
    private readonly tmdbRepo: TmdbRepository,
  ) {}

  async execute(
    userId: string,
    tmdbId: number,
    mediaType: 'movie' | 'tv',
  ): Promise<Favorite> {
    const isAlreadyFavorite = await this.favoriteRepo.isFavorite(userId, tmdbId);
    if (isAlreadyFavorite) {
      throw new Error('Este contenido ya está marcado como favorito');
    }

    // 2) Asegurar que existe el Tmdb en BD
    const existingTmdb = await this.tmdbRepo.findById(tmdbId);
    if (!existingTmdb) {
      // Si no existe, buscamos en la API y lo guardamos
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

    const favorite = await this.favoriteRepo.addFavorite(userId, tmdbId);

    await this.activityRepo.log(
      new ActivityLog(
        undefined,
        userId,
        'added_favorite',
        tmdbId,
        undefined,
        new Date(),
      )
    );

    return favorite;
  }
}

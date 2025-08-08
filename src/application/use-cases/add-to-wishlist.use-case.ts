import { Inject, Injectable } from '@nestjs/common';
import { ActivityLog } from '../../domain/entities/activity-log';
import { TmdbService } from '../../infrastructure/tmdb/tmdb.service';
import { Tmdb } from '../../domain/entities/tmdb';
import { WishListItem } from 'src/domain/entities/wishlist-item';
import { WISHLIST_REPOSITORY, WishListRepository } from '../ports/wishlist.repository';
import { ACTIVITY_LOG_REPOSITORY, ActivityLogRepository } from '../ports/activity-log.repository';
import { TMDB_REPOSITORY, TmdbRepository } from '../ports/tmdb.repository';

@Injectable()
export class AddToWishListUseCase {
  constructor(
    @Inject(WISHLIST_REPOSITORY)
    private readonly wishListRepo: WishListRepository,

    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityRepo: ActivityLogRepository,

    private readonly tmdbService: TmdbService,

    @Inject(TMDB_REPOSITORY)
    private readonly tmdbRepo: TmdbRepository,
  ) {}

  /**
   * Agrega un ítem a la lista de deseados del usuario.
   * - Verifica que no esté ya en la wishlist.
   * - Asegura que exista la metadata en la tabla Tmdb.
   * - Crea el registro en WishListItem.
   * - Logea la acción en ActivityLog.
   */
  async execute(
    userId: string,
    tmdbId: number,
    mediaType: 'movie' | 'tv',      // opcional si quieres validar tipo
  ): Promise<WishListItem> {
    // 1) Si ya está en wishlist, error
    const already = await this.wishListRepo.isInWishList(userId, tmdbId);
    if (already) {
      throw new Error('Este ítem ya está en tu lista de deseados');
    }

    // 2) Asegurar que exista el registro en Tmdb
    let tmdbEntity = await this.tmdbRepo.findById(tmdbId);
    if (!tmdbEntity) {
      const details = await this.tmdbService.getDetails(tmdbId, mediaType);
      tmdbEntity = new Tmdb(
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
      );
      await this.tmdbRepo.save(tmdbEntity);
    }

    // 3) Crear WishListItem
    const wish = await this.wishListRepo.addToWishList(userId, tmdbId);

    // 4) Log de actividad
    await this.activityRepo.log(
      new ActivityLog(
        undefined,
        userId,
        'added_wishlist',
        tmdbId,
        undefined,
        new Date(),
      ),
    );

    return wish;
  }
}

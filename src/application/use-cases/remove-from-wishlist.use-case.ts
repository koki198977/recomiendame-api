import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityLog } from '../../domain/entities/activity-log';
import { WISHLIST_REPOSITORY, WishListRepository } from '../ports/wishlist.repository';
import { ACTIVITY_LOG_REPOSITORY, ActivityLogRepository } from '../ports/activity-log.repository';

@Injectable()
export class RemoveFromWishListUseCase {
  constructor(
    @Inject(WISHLIST_REPOSITORY)
    private readonly wishListRepo: WishListRepository,

    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityRepo: ActivityLogRepository,
  ) {}

  /**
   * Elimina un ítem de la lista de deseados del usuario.
   * - Verifica que el ítem exista en la lista.
   * - Elimina el registro.
   * - Registra la acción en ActivityLog.
   */
  async execute(userId: string, tmdbId: number): Promise<void> {
    // 1) Verificar existencia
    const exists = await this.wishListRepo.isInWishList(userId, tmdbId);
    if (!exists) {
      throw new NotFoundException('Este ítem no está en tu lista de deseados');
    }

    // 2) (Opcional) obtener metadata antes de borrar, si la necesitas
    const all = await this.wishListRepo.findAllByUser(userId);
    const item = all.items.find((w) => w.tmdbId === tmdbId);

    // 3) Eliminar
    await this.wishListRepo.removeFromWishList(userId, tmdbId);

    // 4) Log de actividad
    await this.activityRepo.log(
      new ActivityLog(
        undefined,
        userId,
        'removed_wishlist',
        tmdbId,
        undefined,
        new Date(),
      ),
    );
  }
}

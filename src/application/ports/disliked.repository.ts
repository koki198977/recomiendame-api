import { DislikedItem } from '../../domain/entities/disliked-item';
import { PaginatedResult } from '../dtos/paginated-result.dto';

export const DISLIKED_REPOSITORY = Symbol('DISLIKED_REPOSITORY');

export interface DislikedRepository {
  addDisliked(userId: string, tmdbId: number, mediaType: string): Promise<DislikedItem>;
  removeDisliked(userId: string, tmdbId: number): Promise<void>;
  isDisliked(userId: string, tmdbId: number): Promise<boolean>;
  getDisliked(userId: string, take?: number, skip?: number): Promise<PaginatedResult<DislikedItem>>;
  getAllDislikedIds(userId: string): Promise<number[]>;
}

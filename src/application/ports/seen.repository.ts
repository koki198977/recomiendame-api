import { ListQueryDto } from 'src/infrastructure/dtos/list-query.dto';
import { SeenItem } from '../../domain/entities/seen-item';
import { PaginatedResult } from '../dtos/paginated-result.dto';
export const SeenRepositoryToken = Symbol('SeenRepository');

export interface SeenRepository {
  save(item: SeenItem): Promise<void>;
  findByUser(userId: string, query?: ListQueryDto): Promise<PaginatedResult<SeenItem>>;
  hasSeen(userId: string, tmdbId: number): Promise<boolean>;
  getSeenItems(userId: string): Promise<PaginatedResult<SeenItem>>;
  removeSeen(userId: string, tmdbId: number): Promise<void>;
}
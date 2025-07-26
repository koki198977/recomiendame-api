import { ListQueryDto } from 'src/infrastructure/dtos/list-query.dto';
import { SeenItem } from '../../domain/entities/seen-item';
export const SeenRepositoryToken = Symbol('SeenRepository');

export interface SeenRepository {
  save(item: SeenItem): Promise<void>;
  findByUser(userId: string, query?: ListQueryDto): Promise<SeenItem[]>;
  hasSeen(userId: string, tmdbId: number): Promise<boolean>;
  getSeenItems(userId: string): Promise<SeenItem[]>;
}
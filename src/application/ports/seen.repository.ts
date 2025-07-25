import { SeenItem } from '../../domain/entities/seen-item';
export const SeenRepositoryToken = Symbol('SeenRepository');

export interface SeenRepository {
  save(item: SeenItem): Promise<void>;
  findByUser(userId: string): Promise<SeenItem[]>;
  hasSeen(userId: string, tmdbId: number): Promise<boolean>;
}
import { Tmdb } from 'src/domain/entities/tmdb';

export const TMDB_REPOSITORY = Symbol('TMDB_REPOSITORY');

export interface TmdbRepository {
  save(tmdb: Tmdb): Promise<void>;
  findById(id: number): Promise<Tmdb | null>;
}

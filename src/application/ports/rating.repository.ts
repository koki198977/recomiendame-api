import { Rating } from '../../domain/entities/rating';

export const RATING_REPOSITORY = Symbol('RATING_REPOSITORY');

export interface RatingRepository {
  rate(userId: string, tmdbId: number, title: string, rating: number, comment?: string): Promise<Rating>;
  getRatingsByUser(userId: string): Promise<Rating[]>;
  getRating(userId: string, tmdbId: number): Promise<Rating | null>;
}

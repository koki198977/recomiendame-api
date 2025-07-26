import { ListQueryDto } from 'src/infrastructure/dtos/list-query.dto';
import { Rating } from '../../domain/entities/rating';
import { PaginatedResult } from '../dtos/paginated-result.dto';

export const RATING_REPOSITORY = Symbol('RATING_REPOSITORY');

export interface RatingRepository {
  rate(userId: string, tmdbId: number, title: string, mediaType: 'movie' | 'tv', rating: number, comment?: string): Promise<Rating>;
  getRatingsByUser(userId: string, query?:ListQueryDto): Promise<PaginatedResult<Rating>>;
  getRating(userId: string, tmdbId: number): Promise<Rating | null>;
}

import { SeenItem } from '../../domain/entities/seen-item';
import { Favorite } from '../../domain/entities/favorite';
import { Rating } from '../../domain/entities/rating';

export const USER_DATA_REPOSITORY = Symbol('USER_DATA_REPOSITORY');

export interface UserDataRepository {
  getSeenItems(userId: string): Promise<SeenItem[]>;
  getFavorites(userId: string): Promise<Favorite[]>;
  getRatings(userId: string): Promise<Rating[]>;
}

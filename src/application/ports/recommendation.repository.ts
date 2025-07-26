import { Recommendation } from "src/domain/entities/recommendation";

export const RECOMMENDATION_REPOSITORY = Symbol('RECOMMENDATION_REPOSITORY');

export interface RecommendationRepository {
  save(recommendation: Recommendation): Promise<void>;
  findAllByUser(userId: string): Promise<Recommendation[]>;
  findLatestByUser(userId: string, limit: number): Promise<Recommendation[]>;
}

import { Recommendation } from "src/domain/entities/recommendation";
import { PaginatedResult } from "../dtos/paginated-result.dto";
import { ListQueryDto } from "src/infrastructure/dtos/list-query.dto";

export const RECOMMENDATION_REPOSITORY = Symbol('RECOMMENDATION_REPOSITORY');

export interface RecommendationRepository {
  save(recommendation: Recommendation): Promise<void>;
  findAllByUser(userId: string): Promise<Recommendation[]>;
  findLatestByUser(userId: string, limit: number): Promise<Recommendation[]>;
  findPaginatedByUser(
    userId: string,
    query?: ListQueryDto,
  ): Promise<PaginatedResult<Recommendation>>;
}

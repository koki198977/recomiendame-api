import { Inject, Injectable } from '@nestjs/common';
import { RECOMMENDATION_REPOSITORY, RecommendationRepository } from '../ports/recommendation.repository';
import { PaginatedResult } from '../dtos/paginated-result.dto';
import { RecommendationResponse } from 'src/domain/entities/recommendation.response';
import { ListQueryDto } from 'src/infrastructure/dtos/list-query.dto';

@Injectable()
export class GetRecommendationHistoryUseCase {
  constructor(
    @Inject(RECOMMENDATION_REPOSITORY)
    private readonly recommendationRepo: RecommendationRepository,
  ) {}

  async execute(
    userId: string,
    query?: ListQueryDto,
  ): Promise<PaginatedResult<RecommendationResponse>> {
    const result = await this.recommendationRepo.findPaginatedByUser(userId, query);

    const items = result.items.map((recommendation) => ({
      id: recommendation.id,
      tmdbId: recommendation.tmdbId,
      reason: recommendation.reason,
      createdAt: recommendation.createdAt.toISOString(),
      title: recommendation.tmdb?.title,
      posterUrl: recommendation.tmdb?.posterUrl,
      overview: recommendation.tmdb?.overview,
      releaseDate: recommendation.tmdb?.releaseDate?.toISOString(),
      voteAverage: recommendation.tmdb?.voteAverage,
      mediaType: recommendation.tmdb?.mediaType,
      popularity: recommendation.tmdb?.popularity,
      platforms: recommendation.tmdb?.platforms,
      trailerUrl: recommendation.tmdb?.trailerUrl,
    }));

    return new PaginatedResult<RecommendationResponse>(
      result.total,
      items,
      result.page,
      result.pageSize,
      result.totalPages,
      result.hasNextPage,
    );
  }
}

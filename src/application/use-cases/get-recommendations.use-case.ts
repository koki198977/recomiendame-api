import { Injectable, Inject } from '@nestjs/common';
import { RECOMMENDATION_REPOSITORY, RecommendationRepository } from '../ports/recommendation.repository';
import { RecommendationResponse } from 'src/domain/entities/recommendation.response';

@Injectable()
export class GetRecommendationsUseCase {
  constructor(
    @Inject(RECOMMENDATION_REPOSITORY)
    private readonly recommendationRepo: RecommendationRepository,
  ) {}

  async execute(userId: string): Promise<RecommendationResponse[]> {
    const recs = await this.recommendationRepo.findLatestByUser(userId, 8);
    return recs.map((r) => ({
      id:            r.id,
      tmdbId:        r.tmdbId,
      reason:        r.reason,
      createdAt:     r.createdAt.toISOString(),

      title:         r.tmdb?.title ,
      posterUrl:     r.tmdb?.posterUrl,
      overview:      r.tmdb?.overview,
      releaseDate:   r.tmdb?.releaseDate?.toISOString(),
      voteAverage:   r.tmdb?.voteAverage,
      mediaType:     r.tmdb?.mediaType,
      popularity:    r.tmdb?.popularity,
      platforms:     r.tmdb?.platforms,
      trailerUrl:    r.tmdb?.trailerUrl,
    }));
  }
}

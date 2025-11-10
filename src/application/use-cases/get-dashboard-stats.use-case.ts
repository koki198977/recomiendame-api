import { Inject, Injectable } from '@nestjs/common';
import { SeenRepository, SeenRepositoryToken } from '../ports/seen.repository';
import { FAVORITE_REPOSITORY, FavoriteRepository } from '../ports/favorite.repository';
import { RATING_REPOSITORY, RatingRepository } from '../ports/rating.repository';
import { GetUserByIdUseCase } from './get-user-by-id.use-case';
import { RECOMMENDATION_REPOSITORY, RecommendationRepository } from '../ports/recommendation.repository';

@Injectable()
export class GetDashboardStatsUseCase {
  constructor(
    @Inject(SeenRepositoryToken)
    private readonly seenRepo: SeenRepository,
    @Inject(FAVORITE_REPOSITORY)
    private readonly favoriteRepo: FavoriteRepository,
    @Inject(RATING_REPOSITORY)
    private readonly ratingRepo: RatingRepository,
    @Inject(RECOMMENDATION_REPOSITORY)
    private readonly recommendationRepo: RecommendationRepository,
    private readonly getUserById: GetUserByIdUseCase,
  ) {}

  async execute(userId: string) {
    const [seenData, favoritesData, ratingsData, user, recentRecommendations] = await Promise.all([
      this.seenRepo.getSeenItems(userId),
      this.favoriteRepo.findAllByUser(userId),
      this.ratingRepo.getRatingsByUser(userId),
      this.getUserById.execute(userId),
      this.recommendationRepo.findLatestByUser(userId, 7),
    ]);

    const seen = seenData.items;
    const ratings = ratingsData.items;
    const favorites = favoritesData.items;

    const stats = {
      seenTotal: seenData.total,
      favoriteTotal: favoritesData.total,
      ratingsTotal: ratingsData.total,
      averageRating:
        ratings.length > 0
          ? parseFloat((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(2))
          : null,
      breakdownByType: {
        movie: {
          seen: seen.filter((i) => i.tmdb?.mediaType === 'movie').length,
          favorites: favorites.filter((i) => i.tmdb?.mediaType === 'movie').length,
          ratings: ratings.filter((r) => r.tmdb?.mediaType === 'movie').length,
        },
        tv: {
          seen: seen.filter((i) => i.tmdb?.mediaType === 'tv').length,
          favorites: favorites.filter((i) => i.tmdb?.mediaType === 'tv').length,
          ratings: ratings.filter((r) => r.tmdb?.mediaType === 'tv').length,
        },
      },
      favoriteGenres: user.favoriteGenres || [],
      recentRecommendations: recentRecommendations.map((r) => ({
        title: r.tmdb?.title,
        tmdbId: r.tmdbId,
        mediaType: r.tmdb?.mediaType,
        overview: r.tmdb?.overview,
        voteAverage: r.tmdb?.voteAverage,
        reason: r.reason,
        posterUrl: r.tmdb?.posterUrl,
        createdAt: r.createdAt,
        trailerUrl: r.tmdb?.trailerUrl ?? null,
        platforms: r.tmdb?.platforms ?? [],
      })),
    };

    return stats;
  }

}

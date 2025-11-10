import { Inject, Injectable } from '@nestjs/common';
import { OpenAiService } from '../../infrastructure/ai/openai.service';
import { USER_DATA_REPOSITORY, UserDataRepository } from '../ports/user-data.repository';
import { RECOMMENDATION_REPOSITORY, RecommendationRepository } from '../ports/recommendation.repository';
import { ACTIVITY_LOG_REPOSITORY, ActivityLogRepository } from '../ports/activity-log.repository';
import { USER_REPOSITORY, UserRepository } from '../ports/user.repository';
import { Recommendation } from 'src/domain/entities/recommendation';
import { ActivityLog } from 'src/domain/entities/activity-log';
import { TmdbService } from 'src/infrastructure/tmdb/tmdb.service';
import cuid from 'cuid';
import { TMDB_REPOSITORY, TmdbRepository } from '../ports/tmdb.repository';
import { Tmdb } from 'src/domain/entities/tmdb';
import { RecommendationResponse } from 'src/domain/entities/recommendation.response';
import { RecommendationPromptBuilder } from 'src/helpers/recommendation-prompt.builder';
import { RecommendationScorer } from 'src/helpers/recommendation-scorer';

@Injectable()
export class GenerateRecommendationsUseCase {
  constructor(
    private readonly openAi: OpenAiService,
    private readonly tmdbService: TmdbService,
    @Inject(USER_DATA_REPOSITORY)
    private readonly userDataRepo: UserDataRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Inject(RECOMMENDATION_REPOSITORY)
    private readonly recommendationRepo: RecommendationRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityLogRepo: ActivityLogRepository,
    @Inject(TMDB_REPOSITORY)
    private readonly tmdbRepository: TmdbRepository,
  ) {}

  async execute(
    userId: string,
    feedback?: string,
    tmdbId?: number
  ): Promise<RecommendationResponse[]> {
    // 1) Load user data
    const [
      seenItems,
      favorites,
      ratings,
      recentRecs,
      allRecs,
      user,
      wishlist
    ] = await Promise.all([
      this.userDataRepo.getSeenItems(userId),
      this.userDataRepo.getFavorites(userId),
      this.userDataRepo.getRatings(userId),
      this.recommendationRepo.findLatestByUser(userId, 10),
      this.recommendationRepo.findAllByUser(userId),
      this.userRepo.findById(userId),
      this.userDataRepo.getWishlist(userId),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    // 2) Build intelligent prompt
    const prompt = new RecommendationPromptBuilder()
      .withUser(user)
      .withSeenItems(seenItems)
      .withFavorites(favorites)
      .withRatings(ratings)
      .withRecentRecommendations(recentRecs)
      .withWishlist(wishlist)
      .withFeedback(feedback || '')
      .build();
    console.log("prompt: "+prompt)
    // 3) Generate recommendations from AI
    const raw = await this.openAi.generate(prompt);
    const aiTitles = this.parseRecommendations(raw);

    // 4) Search and score all candidates
    const allPrevIds = new Set(allRecs.map(r => r.tmdbId));
    const candidates = await this.searchAndScoreCandidates(
      aiTitles,
      user,
      favorites,
      ratings,
      allPrevIds
    );

    // 5) If not enough, add trending items
    if (candidates.length < 5) {
      const trendingCandidates = await this.addTrendingCandidates(
        5 - candidates.length,
        user,
        favorites,
        ratings,
        allPrevIds
      );
      candidates.push(...trendingCandidates);
    }

    // 6) Select best 5 with diversity
    const bestRecs = RecommendationScorer.diversify(candidates, 5);

    // 7) Save and return
    const results = await this.saveRecommendations(
      bestRecs,
      userId,
      allPrevIds
    );

    return this.mapToResponse(results);
  }

  private async searchAndScoreCandidates(
    titles: string[],
    user: any,
    favorites: any[],
    ratings: any[],
    excludeIds: Set<number>
  ) {
    const candidates: any[] = [];
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 3.5;

    // Detect preferred media type
    const movieCount = favorites.filter(f => f.tmdb?.mediaType === 'movie').length;
    const seriesCount = favorites.filter(f => f.tmdb?.mediaType === 'tv').length;
    const preferredMediaType = movieCount > seriesCount * 1.5 
      ? 'movie' 
      : seriesCount > movieCount * 1.5 
      ? 'tv' 
      : undefined;

    for (const title of titles) {
      const results = await this.tmdbService.search(title);
      const first = results[0];
      
      if (!first || excludeIds.has(first.id)) continue;

      const scored = RecommendationScorer.score(first, {
        userFavoriteGenres: user.favoriteGenres || [],
        userAvgRating: avgRating,
        userFavorites: favorites,
        userRatings: ratings,
        preferredMediaType,
      });

      candidates.push(scored);
    }

    return candidates;
  }

  private async addTrendingCandidates(
    count: number,
    user: any,
    favorites: any[],
    ratings: any[],
    excludeIds: Set<number>
  ) {
    const trending = await this.tmdbService.getTrending(count * 2);
    const candidates: any[] = [];

    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 3.5;

    for (const trendingItem of trending) {
      if (excludeIds.has(trendingItem.id)) continue;

      // Search to get full details
      const results = await this.tmdbService.search(trendingItem.title);
      const item = results[0];
      
      if (!item || excludeIds.has(item.id)) continue;

      const scored = RecommendationScorer.score(item, {
        userFavoriteGenres: user.favoriteGenres || [],
        userAvgRating: avgRating,
        userFavorites: favorites,
        userRatings: ratings,
      });

      candidates.push(scored);
    }

    return RecommendationScorer.selectBest(candidates, count);
  }

  private async saveRecommendations(
    scoredRecs: any[],
    userId: string,
    excludeIds: Set<number>
  ): Promise<Array<{ entity: Recommendation; score: number }>> {
    const results: Array<{ entity: Recommendation; score: number }> = [];

    for (const scored of scoredRecs) {
      const item = scored.item;

      // Save to TMDB cache if new
      if (!excludeIds.has(item.id)) {
        await this.tmdbRepository.save(
          new Tmdb(
            item.id,
            item.title,
            new Date(),
            item.posterUrl ?? undefined,
            item.overview ?? undefined,
            item.releaseDate ? new Date(item.releaseDate) : undefined,
            item.genreIds || [],
            item.popularity || 0,
            item.voteAverage || 0,
            item.mediaType || 'movie',
            item.platforms ?? [],
            item.trailerUrl ?? undefined,
          )
        );
      }

      // Create recommendation with intelligent reason
      const reason = scored.reasons.length > 0
        ? scored.reasons.join(' • ')
        : 'Recomendado por IA';

      const recEntity = new Recommendation(
        cuid(),
        userId,
        item.id,
        reason,
        new Date(),
        item,
      );

      // Save if new
      if (!excludeIds.has(item.id)) {
        await this.recommendationRepo.save(recEntity);
        await this.activityLogRepo.log(
          new ActivityLog(
            undefined,
            userId,
            'recommended',
            item.id,
            reason,
            new Date(),
          )
        );
      }

      results.push({ entity: recEntity, score: scored.score });
    }

    return results;
  }

  private mapToResponse(
    results: Array<{ entity: Recommendation; score: number }>
  ): RecommendationResponse[] {
    return results.map(({ entity: rec, score }) => {
      const rd = rec.tmdb!;
      const release = typeof rd.releaseDate === 'string'
        ? new Date(rd.releaseDate).toISOString()
        : rd.releaseDate!.toISOString();

      return {
        id:           rec.id,
        tmdbId:       rec.tmdbId,
        reason:       rec.reason,
        createdAt:    rec.createdAt.toISOString(),
        matchScore:   Math.round(score), // Score de 0-100
        title:        rd.title,
        posterUrl:    rd.posterUrl!,
        overview:     rd.overview!,
        releaseDate:  release,
        voteAverage:  rd.voteAverage,
        mediaType:    rd.mediaType,
        popularity:   rd.popularity,
        platforms:    rd.platforms,
        trailerUrl:   rd.trailerUrl,
        genreIds:     rd.genreIds,
      };
    });
  }

  private parseRecommendations(raw: string | string[]): string[] {
    const text = Array.isArray(raw) ? raw.join('\n') : raw;
    return text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
  }
}

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
    console.log('🤖 Generating recommendations with prompt...');
    const raw = await this.openAi.generate(prompt);
    console.log('📝 OpenAI raw response:', raw);
    
    let aiTitles = this.parseRecommendations(raw);
    console.log('✅ Parsed titles:', aiTitles);

    // 4) Search and score all candidates
    const allPrevIds = new Set(allRecs.map(r => r.tmdbId));
    
    let candidates = await this.searchAndScoreCandidates(
      aiTitles,
      user,
      favorites,
      ratings,
      allPrevIds
    );

    console.log(`📊 Found ${candidates.length} candidates after scoring`);

    // If all AI recommendations were already recommended, try with feedback keywords
    if (candidates.length === 0 && feedback) {
      console.log('⚠️ All AI titles were duplicates, searching TMDB directly with feedback...');
      
      const keywords = this.extractKeywords(feedback);
      console.log('🔑 Extracted keywords:', keywords);
      
      const directTitles: string[] = [];
      for (const keyword of keywords) {
        const directSearchResults = await this.tmdbService.search(keyword);
        const newTitles = directSearchResults
          .slice(0, 5)
          .filter(item => !allPrevIds.has(item.id))
          .map(r => r.title);
        directTitles.push(...newTitles);
        console.log(`🔍 Found ${newTitles.length} new results for keyword "${keyword}"`);
        
        if (directTitles.length >= 10) break;
      }
      
      if (directTitles.length > 0) {
        const directCandidates = await this.searchAndScoreCandidates(
          directTitles,
          user,
          favorites,
          ratings,
          allPrevIds
        );
        candidates.push(...directCandidates);
        console.log(`✅ Added ${directCandidates.length} candidates from direct search`);
      }
    }
    
    // If still not enough and no specific feedback, try genre-based search
    if (candidates.length < 3 && !feedback && user.favoriteGenres && user.favoriteGenres.length > 0) {
      console.log('⚠️ Not enough candidates, searching by favorite genres...');
      
      // Map genre names to better search terms
      const genreSearchTerms: Record<string, string[]> = {
        'Drama': ['drama series', 'dramatic film'],
        'Thriller': ['thriller', 'suspense'],
        'Acción': ['action', 'adventure'],
        'Comedia': ['comedy', 'funny'],
        'Terror': ['horror', 'scary'],
        'Aventura': ['adventure', 'quest'],
        'Ciencia Ficción': ['sci-fi', 'science fiction'],
        'Romance': ['romance', 'love story'],
      };
      
      for (const genre of user.favoriteGenres.slice(0, 2)) {
        const searchTerms = genreSearchTerms[genre] || [genre];
        
        for (const term of searchTerms) {
          const genreResults = await this.tmdbService.search(term);
          const genreTitles = genreResults
            .slice(0, 5)
            .filter(item => !allPrevIds.has(item.id))
            .map(r => r.title);
          
          if (genreTitles.length > 0) {
            const genreCandidates = await this.searchAndScoreCandidates(
              genreTitles,
              user,
              favorites,
              ratings,
              allPrevIds
            );
            candidates.push(...genreCandidates);
            console.log(`✅ Added ${genreCandidates.length} candidates from genre search "${term}"`);
          }
          
          if (candidates.length >= 8) break;
        }
        
        if (candidates.length >= 8) break;
      }
    }

    // 5) If not enough, add trending items
    if (candidates.length < 5) {
      console.log(`⚠️ Only ${candidates.length} candidates, adding trending...`);
      const trendingCandidates = await this.addTrendingCandidates(
        5 - candidates.length,
        user,
        favorites,
        ratings,
        allPrevIds
      );
      candidates.push(...trendingCandidates);
      console.log(`✅ Total candidates after trending: ${candidates.length}`);
    }

    // 6) Last resort: if still not enough, allow re-recommendations from older ones
    if (candidates.length < 5) {
      console.log(`⚠️ Still only ${candidates.length} candidates, allowing re-recommendations from older items...`);
      
      // Get older recommendations (not in recent 10)
      const olderRecs = allRecs
        .filter(r => !recentRecs.some(recent => recent.tmdbId === r.tmdbId))
        .slice(-20); // Last 20 older recommendations
      
      if (olderRecs.length > 0) {
        const olderTitles = olderRecs
          .map(r => r.tmdb?.title)
          .filter(Boolean) as string[];
        
        const olderCandidates = await this.searchAndScoreCandidates(
          olderTitles.slice(0, 10),
          user,
          favorites,
          ratings,
          new Set() // Don't exclude anything this time
        );
        
        candidates.push(...olderCandidates);
        console.log(`✅ Added ${olderCandidates.length} candidates from older recommendations`);
      }
    }

    // 7) If STILL not enough, just use trending without exclusions
    if (candidates.length < 5) {
      console.log(`⚠️ CRITICAL: Only ${candidates.length} candidates, using trending without exclusions...`);
      const emergencyTrending = await this.addTrendingCandidates(
        5 - candidates.length,
        user,
        favorites,
        ratings,
        new Set() // No exclusions
      );
      candidates.push(...emergencyTrending);
      console.log(`✅ Total candidates after emergency trending: ${candidates.length}`);
    }

    // 8) Deduplicate candidates by tmdbId
    const uniqueCandidates = this.deduplicateCandidates(candidates);
    console.log(`🔄 Deduplicated: ${candidates.length} → ${uniqueCandidates.length} unique candidates`);

    // 9) Select best 5 with diversity
    const bestRecs = RecommendationScorer.diversify(uniqueCandidates, 5);

    // 10) Ensure we have at least some recommendations
    if (bestRecs.length === 0) {
      console.error('❌ CRITICAL: No recommendations could be generated!');
      throw new Error('No se pudieron generar recomendaciones. Por favor, intenta de nuevo.');
    }

    console.log(`🎯 Final selection: ${bestRecs.length} recommendations`);

    // 11) Save and return
    const results = await this.saveRecommendations(
      bestRecs,
      userId,
      allPrevIds
    );

    return this.mapToResponse(results);
  }

  private deduplicateCandidates(candidates: any[]): any[] {
    const seen = new Map<number, any>();
    
    for (const candidate of candidates) {
      const id = candidate.item.id;
      
      // Keep the one with higher score
      if (!seen.has(id) || seen.get(id).score < candidate.score) {
        seen.set(id, candidate);
      }
    }
    
    return Array.from(seen.values());
  }

  private async searchAndScoreCandidates(
    titles: string[],
    user: any,
    favorites: any[],
    ratings: any[],
    excludeIds: Set<number>
  ) {
    const candidates: any[] = [];
    const seenIds = new Set<number>(); // Track IDs we've already added
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

    console.log(`🔍 Searching and scoring ${titles.length} titles...`);

    for (const title of titles) {
      try {
        console.log(`  Searching: "${title}"`);
        const results = await this.tmdbService.search(title);
        
        if (results.length === 0) {
          console.log(`  ❌ No results found for: "${title}"`);
          continue;
        }

        const first = results[0];
        console.log(`  ✅ Found: ${first.title} (ID: ${first.id})`);
        
        if (excludeIds.has(first.id)) {
          console.log(`  ⏭️  Skipping (already recommended): ${first.title}`);
          continue;
        }

        if (seenIds.has(first.id)) {
          console.log(`  ⏭️  Skipping (duplicate in this batch): ${first.title}`);
          continue;
        }

        const scored = RecommendationScorer.score(first, {
          userFavoriteGenres: user.favoriteGenres || [],
          userAvgRating: avgRating,
          userFavorites: favorites,
          userRatings: ratings,
          preferredMediaType,
        });

        console.log(`  📊 Score: ${scored.score} - ${scored.reasons.join(', ')}`);
        candidates.push(scored);
        seenIds.add(first.id); // Mark as seen
      } catch (error) {
        console.error(`  ❌ Error searching "${title}":`, error.message);
      }
    }

    console.log(`✅ Total valid candidates: ${candidates.length}`);
    return candidates;
  }

  private async addTrendingCandidates(
    count: number,
    user: any,
    favorites: any[],
    ratings: any[],
    excludeIds: Set<number>
  ) {
    console.log(`🔥 Fetching trending items (need ${count})...`);
    const trending = await this.tmdbService.getTrending(count * 3); // Fetch more to account for duplicates
    const candidates: any[] = [];

    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 3.5;

    console.log(`📺 Got ${trending.length} trending items from TMDB`);

    for (const trendingItem of trending) {
      if (candidates.length >= count) break; // Stop when we have enough

      console.log(`  Checking trending: ${trendingItem.title} (ID: ${trendingItem.id})`);
      
      if (excludeIds.has(trendingItem.id)) {
        console.log(`  ⏭️  Already recommended`);
        continue;
      }

      // Search to get full details
      try {
        const results = await this.tmdbService.search(trendingItem.title);
        const item = results[0];
        
        if (!item) {
          console.log(`  ❌ Not found in search`);
          continue;
        }
        
        if (excludeIds.has(item.id)) {
          console.log(`  ⏭️  Already recommended (after search)`);
          continue;
        }

        const scored = RecommendationScorer.score(item, {
          userFavoriteGenres: user.favoriteGenres || [],
          userAvgRating: avgRating,
          userFavorites: favorites,
          userRatings: ratings,
        });

        console.log(`  ✅ Added with score: ${scored.score}`);
        candidates.push(scored);
      } catch (error) {
        console.error(`  ❌ Error processing trending item:`, error.message);
      }
    }

    console.log(`✅ Found ${candidates.length} trending candidates`);
    return RecommendationScorer.selectBest(candidates, count);
  }

  private async saveRecommendations(
    scoredRecs: any[],
    userId: string,
    excludeIds: Set<number>
  ): Promise<Array<{ entity: Recommendation; score: number }>> {
    const results: Array<{ entity: Recommendation; score: number }> = [];
    const savedIds = new Set<number>(); // Track what we save in this batch

    for (const scored of scoredRecs) {
      const item = scored.item;

      // Skip if already saved in this batch
      if (savedIds.has(item.id)) {
        console.log(`⏭️  Skipping duplicate in save batch: ${item.title} (ID: ${item.id})`);
        continue;
      }

      // Save to TMDB cache if new
      if (!excludeIds.has(item.id)) {
        try {
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
        } catch (error) {
          console.log(`⚠️  TMDB cache save failed (may already exist): ${item.title}`);
        }
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
        try {
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
          savedIds.add(item.id);
          console.log(`✅ Saved recommendation: ${item.title} (ID: ${item.id})`);
        } catch (error) {
          console.error(`❌ Failed to save recommendation ${item.title}:`, error.message);
          // Skip this one but continue with others
          continue;
        }
      } else {
        console.log(`⏭️  Not saving (already recommended): ${item.title}`);
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

  private extractKeywords(feedback: string): string[] {
    const keywords: string[] = [];
    const lower = feedback.toLowerCase();
    
    // Map common themes to search terms
    const themeMap: Record<string, string[]> = {
      'informática': ['hacker', 'programmer', 'silicon valley', 'tech', 'computer'],
      'tecnología': ['tech', 'ai', 'robot', 'future', 'cyber'],
      'hackers': ['hacker', 'cyber', 'security'],
      'programación': ['programmer', 'developer', 'coding', 'silicon valley'],
      'inteligencia artificial': ['ai', 'artificial intelligence', 'robot'],
      'ciencia ficción': ['sci-fi', 'space', 'future'],
      'terror': ['horror', 'scary', 'thriller'],
      'comedia': ['comedy', 'funny'],
      'drama': ['drama'],
      'acción': ['action'],
    };
    
    // Check for theme matches
    for (const [theme, searches] of Object.entries(themeMap)) {
      if (lower.includes(theme)) {
        keywords.push(...searches);
      }
    }
    
    // If no themes matched, use the feedback itself
    if (keywords.length === 0) {
      keywords.push(feedback);
    }
    
    return [...new Set(keywords)].slice(0, 3); // Max 3 keywords
  }

  private parseRecommendations(raw: string | string[]): string[] {
    const text = Array.isArray(raw) ? raw.join('\n') : raw;
    
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      // Remove common prefixes
      .map(l => {
        // Remove numbering: "1. Title", "1) Title", "1 - Title"
        l = l.replace(/^\d+[\.\)\-\:]\s*/, '');
        // Remove bullet points: "- Title", "* Title", "• Title"
        l = l.replace(/^[\-\*•]\s*/, '');
        // Remove quotes
        l = l.replace(/^["']|["']$/g, '');
        return l.trim();
      })
      .filter(l => {
        // Filter out lines that look like descriptions or instructions
        const lower = l.toLowerCase();
        if (lower.startsWith('ejemplo')) return false;
        if (lower.startsWith('responde')) return false;
        if (lower.startsWith('no incluyas')) return false;
        if (lower.startsWith('formato')) return false;
        if (lower.includes('por línea')) return false;
        if (l.length < 2) return false;
        if (l.length > 100) return false; // Titles shouldn't be this long
        return true;
      });

    console.log('🔍 Parsed lines after cleaning:', lines);
    return lines;
  }
}

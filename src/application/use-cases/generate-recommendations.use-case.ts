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
    // 3) Generate recommendations from AI (with retry if too many duplicates)
    console.log('🤖 Generating recommendations with prompt...');
    let raw = await this.openAi.generate(prompt);
    console.log('📝 OpenAI raw response:', raw);
    
    let aiTitles = this.parseRecommendations(raw);
    console.log('✅ Parsed titles:', aiTitles);
    
    // Quick check: if all titles are in recent recommendations, regenerate once
    const allAreDuplicates = aiTitles.every(title => {
      const lower = title.toLowerCase();
      return recentRecs.some(r => r.tmdb?.title.toLowerCase() === lower);
    });
    
    if (allAreDuplicates && aiTitles.length > 0) {
      console.log('⚠️ All AI titles are duplicates, regenerating with more creativity...');
      const retryPrompt = prompt + '\n\nIMPORTANTE: Los títulos anteriores ya fueron recomendados. Genera 5 títulos COMPLETAMENTE DIFERENTES.';
      raw = await this.openAi.generate(retryPrompt);
      aiTitles = this.parseRecommendations(raw);
      console.log('🔄 Retry titles:', aiTitles);
    }

    // 4) Don't exclude anything - just show what OpenAI recommends
    // The prompt already tells OpenAI what to avoid
    const allPrevIds = new Set<number>(); // Empty set = no exclusions
    
    console.log(`📋 No exclusions - showing all recommendations from AI`);
    
    let candidates = await this.searchAndScoreCandidates(
      aiTitles,
      user,
      favorites,
      ratings,
      allPrevIds
    );

    console.log(`📊 Found ${candidates.length} candidates after scoring`);

    // If very few candidates and we have feedback, try regenerating with more specific instructions
    if (candidates.length < 2 && feedback && aiTitles.length > 0) {
      const duplicateCount = aiTitles.length - candidates.length;
      if (duplicateCount >= 3) {
        console.log(`⚠️ ${duplicateCount} of ${aiTitles.length} AI titles were duplicates. Regenerating with stricter instructions...`);
        
        const retryPrompt = prompt + `\n\n🚨 ATENCIÓN: Los siguientes títulos YA fueron recomendados, NO los repitas: ${aiTitles.join(', ')}\n\nGenera 5 títulos COMPLETAMENTE DIFERENTES que cumplan con la solicitud.`;
        
        const retryRaw = await this.openAi.generate(retryPrompt);
        const retryTitles = this.parseRecommendations(retryRaw);
        console.log('🔄 Retry attempt with new titles:', retryTitles);
        
        const retryCandidates = await this.searchAndScoreCandidates(
          retryTitles,
          user,
          favorites,
          ratings,
          allPrevIds
        );
        
        candidates.push(...retryCandidates);
        console.log(`✅ After retry: ${candidates.length} total candidates`);
      }
    }

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

    // 6) Skip re-recommendations fallback - causes too many duplicates
    // Users prefer new content over re-recommendations

    // 7) Deduplicate candidates by tmdbId
    const uniqueCandidates = this.deduplicateCandidates(candidates);
    console.log(`🔄 Deduplicated: ${candidates.length} → ${uniqueCandidates.length} unique candidates`);

    // 8) If not enough and user gave feedback, allow re-recommendations that match the feedback
    if (uniqueCandidates.length < 3 && feedback) {
      console.log(`⚠️ Only ${uniqueCandidates.length} candidates with feedback "${feedback}"`);
      console.log(`🔄 Searching for previously recommended titles that match the feedback...`);
      
      // Get titles that were already recommended but match the feedback
      const matchingOldRecs = await this.findMatchingOldRecommendations(
        feedback,
        allRecs,
        user,
        favorites,
        ratings,
        5 - uniqueCandidates.length
      );
      
      if (matchingOldRecs.length > 0) {
        uniqueCandidates.push(...matchingOldRecs);
        console.log(`✅ Added ${matchingOldRecs.length} matching old recommendations`);
      }
    }

    // 9) If STILL not enough and NO feedback, use trending
    if (uniqueCandidates.length < 3 && !feedback) {
      console.log(`⚠️ CRITICAL: Only ${uniqueCandidates.length} candidates, using trending...`);
      const emergencyTrending = await this.addTrendingCandidates(
        5 - uniqueCandidates.length,
        user,
        favorites,
        ratings,
        new Set() // No exclusions
      );
      uniqueCandidates.push(...emergencyTrending);
      console.log(`✅ Total candidates after emergency trending: ${uniqueCandidates.length}`);
    }

    // 9) Select best with diversity
    const bestRecs = RecommendationScorer.diversify(uniqueCandidates, 5);

    // 10) Ensure we have at least some recommendations
    if (bestRecs.length === 0) {
      console.error('❌ CRITICAL: No recommendations could be generated!');
      console.error(`User has ${allPrevIds.size} previous recommendations`);
      console.error(`Feedback: ${feedback || 'none'}`);
      throw new Error(
        `No se pudieron generar recomendaciones nuevas. ` +
        `Has visto ${allPrevIds.size} títulos! ` +
        `Intenta con un feedback diferente o más general.`
      );
    }
    
    // Warn if we had to use re-recommendations
    const hasReRecommendations = bestRecs.some(rec => 
      allPrevIds.has(rec.item.id)
    );
    
    if (hasReRecommendations) {
      console.log(`⚠️ WARNING: Some recommendations are repeats because user has seen ${allPrevIds.size} titles`);
    }

    console.log(`🎯 Final selection: ${bestRecs.length} recommendations`);

    // 11) Save and return (always save, even if previously recommended)
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

  private async findMatchingOldRecommendations(
    feedback: string,
    allRecs: any[],
    user: any,
    favorites: any[],
    ratings: any[],
    count: number
  ): Promise<any[]> {
    // Ask OpenAI which of the old recommendations match the feedback
    const oldTitles = allRecs
      .slice(-50) // Last 50 recommendations
      .map(r => r.tmdb?.title)
      .filter(Boolean);
    
    if (oldTitles.length === 0) return [];

    const matchPrompt = `
De la siguiente lista de títulos, selecciona los ${count} que MEJOR coincidan con: "${feedback}"

Títulos disponibles:
${oldTitles.join('\n')}

Responde SOLO con los títulos que coincidan, uno por línea, sin numeración.
Si ninguno coincide bien, responde con "NINGUNO".
`;

    try {
      const response = await this.openAi.generate(matchPrompt);
      
      if (response.trim().toUpperCase() === 'NINGUNO') {
        console.log('❌ No matching old recommendations found');
        return [];
      }

      const matchingTitles = this.parseRecommendations(response);
      console.log(`🔍 OpenAI found ${matchingTitles.length} matching old titles:`, matchingTitles);

      // Search and score these matching titles
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 3.5;

      const candidates: any[] = [];
      for (const title of matchingTitles.slice(0, count)) {
        try {
          const results = await this.tmdbService.search(title);
          const first = results[0];
          
          if (!first) continue;

          const scored = RecommendationScorer.score(first, {
            userFavoriteGenres: user.favoriteGenres || [],
            userAvgRating: avgRating,
            userFavorites: favorites,
            userRatings: ratings,
          });

          // Mark as re-recommendation by adding to reasons
          scored.reasons.unshift('🔄 Recomendado nuevamente');
          
          candidates.push(scored);
        } catch (error) {
          console.error(`Error searching old recommendation "${title}":`, error.message);
        }
      }

      return candidates;
    } catch (error) {
      console.error('Error finding matching old recommendations:', error.message);
      return [];
    }
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

      // Save to TMDB cache
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
        // Already exists, that's fine
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

      // Try to save - if it fails due to duplicate, just include in response anyway
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
        // Duplicate - that's OK, still include in response
        console.log(`🔄 Re-recommendation: ${item.title} (ID: ${item.id})`);
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
      
      // Safe date handling
      let release: string | undefined;
      try {
        if (rd.releaseDate) {
          if (typeof rd.releaseDate === 'string') {
            const date = new Date(rd.releaseDate);
            release = isNaN(date.getTime()) ? undefined : date.toISOString();
          } else if (rd.releaseDate instanceof Date) {
            release = isNaN(rd.releaseDate.getTime()) ? undefined : rd.releaseDate.toISOString();
          }
        }
      } catch (error) {
        console.warn(`⚠️  Invalid release date for ${rd.title}:`, rd.releaseDate);
        release = undefined;
      }

      return {
        id:           rec.id,
        tmdbId:       rec.tmdbId,
        reason:       rec.reason,
        createdAt:    rec.createdAt.toISOString(),
        matchScore:   Math.round(score), // Score de 0-100
        title:        rd.title,
        posterUrl:    rd.posterUrl || undefined,
        overview:     rd.overview || undefined,
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

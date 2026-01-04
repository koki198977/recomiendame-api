import { Rating } from 'src/domain/entities/rating';
import { Favorite } from 'src/domain/entities/favorite';

export interface TmdbSearchResult {
  id: number;
  title: string;
  posterUrl?: string | null;
  mediaType: string;
  overview?: string;
  releaseDate?: string;
  genreIds?: number[];
  popularity?: number;
  voteAverage?: number;
  trailerUrl?: string;
  platforms?: string[];
}

interface ScoringContext {
  userFavoriteGenres: string[];
  userAvgRating: number;
  userFavorites: Favorite[];
  userRatings: Rating[];
  preferredMediaType?: 'movie' | 'tv';
}

export interface ScoredRecommendation {
  item: TmdbSearchResult;
  score: number;
  reasons: string[];
}

export class RecommendationScorer {
  /**
   * Scores a recommendation based on user preferences and item quality
   * Higher score = better match
   */
  static score(
    item: TmdbSearchResult,
    context: ScoringContext
  ): ScoredRecommendation {
    let score = 0;
    const reasons: string[] = [];

    // Base quality score (0-30 points)
    const qualityScore = this.calculateQualityScore(item);
    score += qualityScore;
    if (qualityScore > 20) {
      reasons.push('Alta calidad');
    }

    // Genre match (0-25 points)
    const genreScore = this.calculateGenreScore(item, context.userFavoriteGenres);
    score += genreScore;
    if (genreScore > 15) {
      reasons.push('Géneros coincidentes');
    }

    // Media type preference (0-15 points)
    if (context.preferredMediaType && item.mediaType === context.preferredMediaType) {
      score += 15;
      reasons.push('Tipo de contenido preferido');
    }

    // Popularity balance (0-15 points)
    const popularityScore = this.calculatePopularityScore(item);
    score += popularityScore;

    // Similar to favorites (0-15 points)
    const similarityScore = this.calculateSimilarityScore(item, context);
    score += similarityScore;
    if (similarityScore > 10) {
      reasons.push('Similar a tus favoritos');
    }

    return { item, score, reasons };
  }

  private static calculateQualityScore(item: TmdbSearchResult): number {
    const voteAvg = item.voteAverage || 0;
    
    // High quality: 8+ rating
    if (voteAvg >= 8) return 30;
    if (voteAvg >= 7.5) return 25;
    if (voteAvg >= 7) return 20;
    if (voteAvg >= 6.5) return 15;
    if (voteAvg >= 6) return 10;
    return 5;
  }

  private static calculateGenreScore(
    item: TmdbSearchResult,
    favoriteGenres: string[]
  ): number {
    if (!favoriteGenres.length || !item.genreIds?.length) return 0;

    // Convert genre IDs to comparable format
    const itemGenreIds = new Set(item.genreIds);
    
    // Map common genre names to TMDB IDs (simplified)
    const genreMap: Record<string, number[]> = {
      'acción': [28, 10759],
      'aventura': [12],
      'comedia': [35],
      'drama': [18],
      'terror': [27],
      'ciencia ficción': [878],
      'fantasía': [14],
      'thriller': [53],
      'romance': [10749],
      'animación': [16],
      'crimen': [80],
      'documental': [99],
      'misterio': [9648],
    };

    let matches = 0;
    for (const favGenre of favoriteGenres) {
      const genreName = favGenre.toLowerCase();
      const genreIds = genreMap[genreName] || [];
      
      for (const id of genreIds) {
        if (itemGenreIds.has(id)) {
          matches++;
          break;
        }
      }
    }

    // Score based on percentage of matched genres
    const matchPercentage = matches / favoriteGenres.length;
    return Math.round(matchPercentage * 25);
  }

  private static calculatePopularityScore(item: TmdbSearchResult): number {
    const popularity = item.popularity || 0;

    // Sweet spot: moderately popular (not too mainstream, not too obscure)
    if (popularity >= 20 && popularity <= 100) return 15;
    if (popularity > 100 && popularity <= 200) return 12;
    if (popularity > 10 && popularity < 20) return 10;
    if (popularity > 200) return 8;
    return 5;
  }

  private static calculateSimilarityScore(
    item: TmdbSearchResult,
    context: ScoringContext
  ): number {
    let score = 0;

    // Check if genres overlap with user's highly-rated items
    const highRatedGenres = new Set<number>();
    
    context.userRatings
      .filter(r => r.rating >= 4)
      .forEach(r => {
        r.tmdb?.genreIds?.forEach(id => highRatedGenres.add(id));
      });

    context.userFavorites.forEach(f => {
      f.tmdb?.genreIds?.forEach(id => highRatedGenres.add(id));
    });

    if (highRatedGenres.size > 0 && item.genreIds) {
      const overlap = item.genreIds.filter(id => highRatedGenres.has(id)).length;
      score += Math.min(overlap * 5, 15);
    }

    return score;
  }

  /**
   * Sorts and filters recommendations by score
   */
  static selectBest(
    scored: ScoredRecommendation[],
    count: number = 8
  ): ScoredRecommendation[] {
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }

  /**
   * Ensures diversity in recommendations
   */
  static diversify(
    scored: ScoredRecommendation[],
    count: number = 8
  ): ScoredRecommendation[] {
    const selected: ScoredRecommendation[] = [];
    const usedGenres = new Set<number>();

    // First pass: select top items with unique primary genres
    for (const item of scored) {
      if (selected.length >= count) break;

      const primaryGenre = item.item.genreIds?.[0];
      if (!primaryGenre || !usedGenres.has(primaryGenre)) {
        selected.push(item);
        if (primaryGenre) usedGenres.add(primaryGenre);
      }
    }

    // Second pass: fill remaining slots with highest scores
    if (selected.length < count) {
      for (const item of scored) {
        if (selected.length >= count) break;
        if (!selected.includes(item)) {
          selected.push(item);
        }
      }
    }

    return selected;
  }
}

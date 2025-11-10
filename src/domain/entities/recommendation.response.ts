export class RecommendationResponse {
  id: string;
  tmdbId: number;
  reason: string;
  createdAt: string;
  matchScore?: number; // Score de 0-100 indicando qué tan buena es la recomendación

  title?: string;
  posterUrl?: string;
  overview?: string;
  releaseDate?: string;
  voteAverage?: number;
  mediaType?: 'movie' | 'tv';
  popularity?: number;
  platforms?: string[];
  trailerUrl?: string;
  genreIds?: number[];
}

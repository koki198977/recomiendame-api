export class RecommendationResponse {
  id: string;
  tmdbId: number;
  reason: string;
  createdAt: string;

  title?: string;
  posterUrl?: string;
  overview?: string;
  releaseDate?: string;
  voteAverage?: number;
  mediaType?: 'movie' | 'tv';
  popularity?: number;
  platforms?: string[];
  trailerUrl?: string;
}

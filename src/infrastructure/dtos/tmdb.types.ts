export interface TmdbDetails {
  id: number;
  title: string;
  posterUrl?: string;
  overview?: string;
  releaseDate?: string;
  genreIds: number[];
  popularity: number;
  voteAverage: number;
  mediaType: 'movie' | 'tv';
  trailerUrl?: string;
  platforms: string[];
}

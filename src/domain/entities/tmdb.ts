export class Tmdb {
  constructor(
    public readonly id: number,
    public title: string,
    public readonly createdAt: Date,
    public readonly posterUrl?: string,
    public readonly overview?: string,
    public readonly releaseDate?: Date | null,
    public readonly genreIds: number[] = [],
    public readonly popularity?: number,
    public readonly voteAverage?: number,
    public readonly mediaType?: 'movie' | 'tv',
    public readonly platforms?: any,
    public readonly trailerUrl?: string
  ) {}
}
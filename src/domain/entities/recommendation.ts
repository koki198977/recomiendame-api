export class Recommendation {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tmdbId: number,
    public title: string,
    public readonly reason: string,
    public readonly createdAt: Date,
    public readonly posterUrl?: string,
    public readonly overview?: string,
    public readonly releaseDate?: Date | null,
    public readonly genreIds: number[] = [],
    public readonly popularity?: number,
    public readonly voteAverage?: number,
    public readonly mediaType?: 'movie' | 'tv',
  ) {}
}
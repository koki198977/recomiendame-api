export class SeenItem {
  constructor(
    public readonly userId: string,
    public readonly tmdbId: number,
    public readonly title: string,
    public readonly mediaType: 'movie' | 'tv',
    public readonly watchedAt: Date = new Date(),
  ) {}
}
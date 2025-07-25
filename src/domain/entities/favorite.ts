export class Favorite {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tmdbId: number,
    public readonly title: string,
    public readonly mediaType: string,
    public readonly createdAt: Date,
  ) {}
}

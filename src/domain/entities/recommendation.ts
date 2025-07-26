export class Recommendation {
  constructor(
    public readonly id: string ,
    public readonly userId: string,
    public readonly tmdbId: number,
    public title: string,
    public readonly reason: string,
    public readonly createdAt: Date
  ) {}
}

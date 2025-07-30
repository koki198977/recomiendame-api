import { Tmdb } from "./tmdb";

export class Recommendation {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tmdbId: number,
    public readonly reason: string,
    public readonly createdAt: Date,
    public readonly tmdb?: Tmdb,
  ) {}
}
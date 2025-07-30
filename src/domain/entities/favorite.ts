import { Tmdb } from "./tmdb";

export class Favorite {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tmdbId: number,
    public readonly createdAt: Date,
    public readonly tmdb?: Tmdb,
  ) {}
}

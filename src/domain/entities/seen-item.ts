import { Tmdb } from "./tmdb";

export class SeenItem {
  constructor(
    public readonly userId: string,
    public readonly tmdbId: number,
    public readonly watchedAt: Date = new Date(),
    public readonly createdAt: Date = new Date(),
    public readonly tmdb?: Tmdb,
  ) {}
}
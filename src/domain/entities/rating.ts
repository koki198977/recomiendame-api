import { Tmdb } from "./tmdb";

export class Rating {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tmdbId: number,
    public readonly rating: number,
    public readonly comment: string | null,
    public readonly createdAt: Date,
    public readonly tmdb?: Tmdb,
  ) {}
}

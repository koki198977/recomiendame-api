export class DislikedItem {
  constructor(
    public readonly id: string | undefined,
    public readonly userId: string,
    public readonly tmdbId: number,
    public readonly mediaType: string,
    public readonly createdAt: Date,
  ) {}
}

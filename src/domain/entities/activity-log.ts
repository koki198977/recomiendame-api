export class ActivityLog {
  constructor(
    public readonly id: string | undefined,
    public readonly userId: string,
    public readonly action: string,
    public readonly tmdbId: number,
    public readonly title: string,
    public readonly mediaType?: string,
    public readonly details?: string,
    public readonly createdAt?: Date,
  ) {}
}
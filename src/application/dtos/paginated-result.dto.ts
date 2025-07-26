export class PaginatedResult<T> {
  constructor(
    public readonly total: number,
    public readonly items: T[],
    public readonly page: number,
    public readonly pageSize: number,
    public readonly totalPages: number,
    public readonly hasNextPage: boolean,
  ) {}
}

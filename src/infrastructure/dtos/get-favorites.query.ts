import { IsOptional, IsIn } from 'class-validator';

export class GetFavoritesQuery {
  @IsOptional()
  @IsIn(['movie', 'tv'])
  mediaType?: 'movie' | 'tv';

  @IsOptional()
  @IsIn(['createdAt', 'title'])
  orderBy?: 'createdAt' | 'title';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

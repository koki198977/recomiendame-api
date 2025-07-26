import { IsOptional, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number;
}

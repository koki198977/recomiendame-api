import { IsOptional, IsIn, IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetFavoritesQuery {
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

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['movie', 'tv'])
  mediaType?: 'movie' | 'tv';

  @IsOptional()
  @IsString()
  platform?: string;
}

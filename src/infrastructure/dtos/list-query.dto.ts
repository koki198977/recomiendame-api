import { IsIn, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListQueryDto {
  @IsOptional()
  @IsIn(['movie', 'tv'])
  mediaType?: 'movie' | 'tv';

  @IsOptional()
  @IsIn(['date', 'title'])
  orderBy?: 'date' | 'title';

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

import { IsIn, IsOptional } from 'class-validator';

export class ListQueryDto {
  @IsOptional()
  @IsIn(['movie', 'tv'])
  mediaType?: 'movie' | 'tv';

  @IsOptional()
  @IsIn(['date', 'title'])
  orderBy?: 'date' | 'title';
  
}

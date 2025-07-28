import { IsInt, IsOptional, IsString, IsIn, Min, Max, IsNumber } from 'class-validator';

export class CreateRatingDto {
  @IsInt()
  tmdbId: number;

  @IsNumber({ maxDecimalPlaces: 1 }) 
  @Min(0.5)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsIn(['movie', 'tv'])
  mediaType: 'movie' | 'tv';

  @IsOptional()
  @IsString()
  comment?: string;
}

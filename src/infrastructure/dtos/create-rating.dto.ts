import { IsInt, IsOptional, IsString, IsIn, Min, Max } from 'class-validator';

export class CreateRatingDto {
  @IsInt()
  tmdbId: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

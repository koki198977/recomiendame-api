import { IsInt, IsString, IsIn } from 'class-validator';

export class AddFavoriteDto {
  @IsInt()
  tmdbId: number;

  @IsString()
  title: string;

  @IsIn(['movie', 'tv'])
  mediaType: 'movie' | 'tv';
}

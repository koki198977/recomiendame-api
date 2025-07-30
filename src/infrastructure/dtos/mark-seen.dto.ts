import { IsInt, IsString, IsIn } from 'class-validator';

export class MarkSeenDto {
  @IsInt()
  tmdbId: number;

  @IsIn(['movie', 'tv'])
  mediaType: 'movie' | 'tv';
}

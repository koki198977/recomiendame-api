import { IsInt, IsIn } from 'class-validator';

export class AddWishListDto {
  @IsInt()
  tmdbId: number;

  @IsIn(['movie', 'tv'])
  mediaType: 'movie' | 'tv';
}

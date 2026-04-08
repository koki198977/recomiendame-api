
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  IsInt,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PickDto {
  @IsInt()
  tmdbId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsIn(['movie', 'tv'])
  mediaType: 'movie' | 'tv';
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsArray()
  favoriteGenres?: string[];

  // Nuevo campo
  @IsOptional()
  @IsString()
  favoriteMedia?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PickDto)
  picks?: PickDto[];
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TmdbRepository } from 'src/application/ports/tmdb.repository';
import { Tmdb } from 'src/domain/entities/tmdb';

@Injectable()
export class TmdbRepositoryImpl implements TmdbRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(tmdb: Tmdb): Promise<void> {
    await this.prisma.tmdb.upsert({
      where: { id: tmdb.id },
      update: {
        title: tmdb.title,
        posterUrl: tmdb.posterUrl,
        overview: tmdb.overview,
        releaseDate: tmdb.releaseDate,
        genreIds: tmdb.genreIds,
        popularity: tmdb.popularity,
        voteAverage: tmdb.voteAverage,
        mediaType: tmdb.mediaType,
        trailerUrl: tmdb.trailerUrl,
        platforms: tmdb.platforms,
      },
      create: {
        id: tmdb.id,
        title: tmdb.title,
        posterUrl: tmdb.posterUrl,
        overview: tmdb.overview,
        releaseDate: tmdb.releaseDate,
        genreIds: tmdb.genreIds,
        popularity: tmdb.popularity,
        voteAverage: tmdb.voteAverage,
        mediaType: tmdb.mediaType ?? 'movie',
        trailerUrl: tmdb.trailerUrl,
        platforms: tmdb.platforms,
      },
    });
  }

  async findById(id: number): Promise<Tmdb | null> {
    const record = await this.prisma.tmdb.findUnique({ where: { id } });
    if (!record) return null;

    return new Tmdb(
      record.id,
      record.title,
      record.createdAt,
      record.posterUrl ?? undefined,
      record.overview ?? undefined,
      record.releaseDate,
      record.genreIds ?? [],
      record.popularity ?? undefined,
      record.voteAverage ?? undefined,
      record.mediaType as 'movie' | 'tv',
      record.platforms,
      record.trailerUrl ?? undefined,
    );
  }
}

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import https from 'https';
import { TmdbDetails } from '../dtos/tmdb.types';

@Injectable()
export class TmdbService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly httpsAgent = new https.Agent({ rejectUnauthorized: false });

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('TMDB_API_KEY')!;
    
  }

  async search(query: string): Promise<any[]> {
    const url = `${this.baseUrl}/search/multi`;

    const { data } = await this.http.axiosRef.get(url, {
      params: {
        api_key: this.apiKey,
        query,
        language: 'es-ES',
      },
    });

    return await Promise.all(
      data.results
        .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
        .map(async (item) => {
          const id = item.id;
          const type = item.media_type;
          const trailerUrl = await this.getTrailerUrl(id, type);
          const platforms = await this.getPlatforms(id, type);

          return {
            id,
            title: item.title || item.name,
            posterUrl: item.poster_path
              ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
              : null,
            mediaType: type,
            overview: item.overview,
            releaseDate: item.release_date || item.first_air_date,
            genreIds: item.genre_ids ?? [],
            popularity: item.popularity ?? 0,
            voteAverage: item.vote_average ?? 0,
            trailerUrl,
            platforms,
          };
        })
    );
  }


  async getDetails(
    tmdbId: number,
    type: 'movie' | 'tv',
  ): Promise<TmdbDetails> {
    return this.fetchDetailsByType(tmdbId, type);
  }

  private async fetchDetailsByType(
    tmdbId: number,
    type: 'movie' | 'tv',
  ): Promise<TmdbDetails> {
    const url = `${this.baseUrl}/${type}/${tmdbId}`;
    const { data } = await this.http.axiosRef.get(url, {
      params: {
        api_key: this.apiKey,
        language: 'es-ES',
      },
      httpsAgent: this.httpsAgent,
    });

    // Usar tus helpers existentes para trailer y plataformas
    const [trailerUrl, platforms] = await Promise.all([
      this.getTrailerUrl(tmdbId, type),
      this.getPlatforms(tmdbId, type),
    ]);

    return {
      id: data.id,
      title: data.title || data.name,
      posterUrl: data.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : undefined,
      overview: data.overview,
      releaseDate: data.release_date || data.first_air_date,
      genreIds: data.genres?.map((g) => g.id) ?? [],
      popularity: data.popularity ?? 0,
      voteAverage: data.vote_average ?? 0,
      mediaType: type,
      trailerUrl,
      platforms,
    };
  }


  async getPoster(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/${mediaType}/${tmdbId}`;
      const { data } = await this.http.axiosRef.get(url, {
        params: {
          api_key: this.apiKey,
          language: 'es-ES',
        },
        httpsAgent: this.httpsAgent,
      });

      return data.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : null;
    } catch (error) {
      console.error(`❌ Error al obtener póster TMDB para ${mediaType} ${tmdbId}:`, error.message);
      return null;
    }
  }

  private async getTrailerUrl(id: number, type: 'movie' | 'tv'): Promise<string | undefined> {
    const url = `${this.baseUrl}/${type}/${id}/videos`;

    try {
      const { data } = await this.http.axiosRef.get(url, {
        params: { api_key: this.apiKey, language: 'es-ES' },
      });

      const trailer = data.results.find(
        (v) => v.type === 'Trailer' && v.site === 'YouTube'
      );

      return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : undefined;
    } catch (error) {
      console.error(`Error al obtener trailer para ${type} ${id}:`, error.message);
      return undefined;
    }
  }

  private async getPlatforms(id: number, type: 'movie' | 'tv'): Promise<string[]> {
    const url = `${this.baseUrl}/${type}/${id}/watch/providers`;

    try {
      const { data } = await this.http.axiosRef.get(url, {
        params: { api_key: this.apiKey },
      });

      const cl = data.results?.CL || data.results?.US;
      const platforms = cl?.flatrate?.map((p) => p.provider_name) ?? [];
      return platforms;
    } catch (error) {
      console.error(`Error al obtener plataformas para ${type} ${id}:`, error.message);
      return [];
    }
  }


}
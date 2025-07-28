import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import https from 'https';

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

  async search(query: string, type: 'movie' | 'tv' = 'movie'): Promise<any[]> {
    const url = `${this.baseUrl}/search/${type}`;
        const { data } = await this.http.axiosRef.get(url, {
            params: {
            api_key: this.apiKey,
            query,
            language: 'es-ES',
            },
        });
       
        return data.results.map((item) => ({
          id: item.id,
          title: item.title || item.name,
          posterUrl: item.poster_path
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : null,
          mediaType: type, // 'movie' o 'tv'
          overview: item.overview,
          releaseDate: item.release_date || item.first_air_date,
          genreIds: item.genre_ids ?? [], // debe ser array de int
          popularity: item.popularity ?? 0,
          voteAverage: item.vote_average ?? 0,
        }));

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


}
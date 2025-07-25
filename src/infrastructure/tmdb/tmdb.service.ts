import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TmdbService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.themoviedb.org/3';

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
            mediaType: type,
            overview: item.overview,
            releaseDate: item.release_date || item.first_air_date,
        }));
  }

}
import { Controller, Get, Query } from '@nestjs/common';
import { TmdbService } from '../tmdb/tmdb.service';

@Controller('search')
export class TmdbController {
  constructor(private readonly tmdbService: TmdbService) {}

  @Get()
  async search(@Query('q') query: string) {
    const results = await this.tmdbService.search(query);
    return { results };
  }
}

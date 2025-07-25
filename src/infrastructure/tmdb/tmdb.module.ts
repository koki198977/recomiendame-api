import { Module } from '@nestjs/common';
import { TmdbService } from './tmdb.service';
import { TmdbController } from '../http/tmdb.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [TmdbController],
  providers: [TmdbService],
})
export class TmdbModule {}

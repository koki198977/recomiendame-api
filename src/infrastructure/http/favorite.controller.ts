import {
  Controller,
  UseGuards,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { AddFavoriteUseCase } from 'src/application/use-cases/add-favorite.use-case';
import { RemoveFavoriteUseCase } from 'src/application/use-cases/remove-favorite.use-case';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { GetFavoritesUseCase } from 'src/application/use-cases/get-favorites.use-case';
import { AddFavoriteDto } from '../dtos/add-favorite.dto';
import { GetFavoritesQuery } from '../dtos/get-favorites.query';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(
    private readonly addFavorite: AddFavoriteUseCase,
    private readonly removeFavorite: RemoveFavoriteUseCase,
    private readonly getFavorites: GetFavoritesUseCase,
  ) {}

  @Post()
  async addFavoriteHandler(
    @CurrentUser() user: { sub: string },
    @Body() body: AddFavoriteDto,
  ) {
    await this.addFavorite.execute(
      user.sub,
      body.tmdbId,
      body.mediaType,
    );
    return { message: 'Agregado a favoritos' };
  }

  @Delete(':tmdbId')
  async removeFavoriteHandler(
    @CurrentUser() user: { sub: string },
    @Param('tmdbId') tmdbId: string,
  ) {
    await this.removeFavorite.execute(user.sub, Number(tmdbId));
    return { message: 'Eliminado de favoritos' };
  }

  @Get()
  async listFavoritesHandler(
    @CurrentUser() user: { sub: string },
    @Query() query: GetFavoritesQuery,
  ) {
    const favorites = await this.getFavorites.execute(user.sub, query);
    return { favorites };
  }
}

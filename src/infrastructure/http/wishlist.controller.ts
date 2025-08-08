import {
  Controller,
  UseGuards,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { AddWishListDto } from '../dtos/add-wishlist.dto';
import { GetWishListQuery } from '../dtos/get-wishlist.query';
import { AddToWishListUseCase } from 'src/application/use-cases/add-to-wishlist.use-case';
import { RemoveFromWishListUseCase } from 'src/application/use-cases/remove-from-wishlist.use-case';
import { GetWishListUseCase } from 'src/application/use-cases/get-wishlist.use-case';


@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishListController {
  constructor(
    private readonly addWishList: AddToWishListUseCase,
    private readonly removeWishList: RemoveFromWishListUseCase,
    private readonly getWishList: GetWishListUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addWishListHandler(
    @CurrentUser() user: { sub: string },
    @Body() body: AddWishListDto,
  ) {
    await this.addWishList.execute(user.sub, body.tmdbId,  body.mediaType);
    return { message: 'Agregado a la lista de deseados' };
  }

  @Delete(':tmdbId')
  async removeWishListHandler(
    @CurrentUser() user: { sub: string },
    @Param('tmdbId') tmdbId: string,
  ) {
    await this.removeWishList.execute(user.sub, Number(tmdbId));
    return { message: 'Eliminado de wishlist' };
  }

  @Get()
  async listWishListHandler(
    @CurrentUser() user: { sub: string },
    @Query() query: GetWishListQuery,
  ) {
    const items = await this.getWishList.execute(
      user.sub,
      query,
    );
    return { wishlist: items };
  }
}
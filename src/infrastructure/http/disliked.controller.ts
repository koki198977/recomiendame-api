import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { AddDislikedUseCase } from '../../application/use-cases/add-disliked.use-case';
import { GetDislikedUseCase } from '../../application/use-cases/get-disliked.use-case';
import { RemoveDislikedUseCase } from '../../application/use-cases/remove-disliked.use-case';

@Controller('disliked')
@UseGuards(JwtAuthGuard)
export class DislikedController {
  constructor(
    private readonly addDislikedUseCase: AddDislikedUseCase,
    private readonly getDislikedUseCase: GetDislikedUseCase,
    private readonly removeDislikedUseCase: RemoveDislikedUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addDisliked(
    @CurrentUser() user: { sub: string },
    @Body() body: { tmdbId: number; mediaType: 'movie' | 'tv' },
  ) {
    const disliked = await this.addDislikedUseCase.execute(
      user.sub,
      body.tmdbId,
      body.mediaType,
    );
    return disliked;
  }

  @Get()
  async getDisliked(
    @CurrentUser() user: { sub: string },
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const takeNum = take ? parseInt(take, 10) : 1000;
    const skipNum = skip ? parseInt(skip, 10) : 0;

    const result = await this.getDislikedUseCase.execute(user.sub, takeNum, skipNum);

    return {
      disliked: {
        items: result.items,
        hasNextPage: result.hasNextPage,
      },
    };
  }

  @Delete(':tmdbId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDisliked(
    @CurrentUser() user: { sub: string },
    @Param('tmdbId', ParseIntPipe) tmdbId: number,
  ) {
    await this.removeDislikedUseCase.execute(user.sub, tmdbId);
  }
}

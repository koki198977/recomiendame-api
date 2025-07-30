import { Controller, Post, Body, UseGuards, Request, Get, Query, Delete, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { MarkSeenUseCase } from '../../application/use-cases/mark-seen.use-case';
import { GetSeenItemsUseCase } from '../../application/use-cases/get-seen-items.use-case';
import { MarkSeenDto } from '../dtos/mark-seen.dto';
import { ListQueryDto } from '../dtos/list-query.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { RemoveSeenUseCase } from 'src/application/use-cases/remove-seen.use-case';

@Controller('seen')
@UseGuards(JwtAuthGuard)
export class SeenController {
  constructor(
    private readonly markSeenUseCase: MarkSeenUseCase,
    private readonly getSeenItemsUseCase: GetSeenItemsUseCase,
    private readonly removeSeenUseCase: RemoveSeenUseCase,
  ) {}

  @Post()
  async mark(@Request() req, @Body() dto: MarkSeenDto) {
    const userId = req.user.sub;
    await this.markSeenUseCase.execute({
      userId,
      ...dto,
    });
    return { message: 'Item marked as seen' };
  }

  @Get()
  async getSeenItems(
    @Request() req,
    @Query() query: ListQueryDto,
  ) {
    const userId = req.user.sub;
    const items = await this.getSeenItemsUseCase.execute(userId, query);
    return items;
  }

  @Delete(':tmdbId')
  async removeFavoriteHandler(
    @CurrentUser() user: { sub: string },
    @Param('tmdbId') tmdbId: string,
  ) {
    await this.removeSeenUseCase.execute(user.sub, Number(tmdbId));
    return { message: 'Eliminado de vistos' };
  }
}

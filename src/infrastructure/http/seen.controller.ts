import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { MarkSeenUseCase } from '../../application/use-cases/mark-seen.use-case';
import { GetSeenItemsUseCase } from '../../application/use-cases/get-seen-items.use-case';

@Controller('seen')
export class SeenController {
  constructor(
    private readonly markSeenUseCase: MarkSeenUseCase,
    private readonly getSeenItemsUseCase: GetSeenItemsUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async markSeen(@Request() req, @Body() body: any) {
    const userId = req.user.id;
    await this.markSeenUseCase.execute({
      userId,
      tmdbId: body.tmdbId,
      title: body.title,
      mediaType: body.mediaType,
    });
    return { message: 'Item marked as seen' };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getSeenItems(@Request() req) {
    const userId = req.user.id;
    const items = await this.getSeenItemsUseCase.execute(userId);
    return items;
  }
}

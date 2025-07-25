import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { MarkSeenUseCase } from '../../application/use-cases/mark-seen.use-case';
import { GetSeenItemsUseCase } from '../../application/use-cases/get-seen-items.use-case';
import { MarkSeenDto } from '../dtos/mark-seen.dto';

@Controller('seen')
export class SeenController {
  constructor(
    private readonly markSeenUseCase: MarkSeenUseCase,
    private readonly getSeenItemsUseCase: GetSeenItemsUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async mark(@Request() req, @Body() dto: MarkSeenDto) {
    const userId = req.user.sub;
    await this.markSeenUseCase.execute({
      userId,
      ...dto,
    });
    return { message: 'Item marked as seen' };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getSeenItems(@Request() req) {
    const userId = req.user.sub;
    const items = await this.getSeenItemsUseCase.execute(userId);
    return items;
  }
}

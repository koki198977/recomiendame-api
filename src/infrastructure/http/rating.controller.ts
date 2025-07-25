import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { RateItemUseCase } from 'src/application/use-cases/rate-item.use-case';
import { GetUserRatingsUseCase } from 'src/application/use-cases/get-user-ratings.use-case';

@Controller('ratings')
@UseGuards(JwtAuthGuard)
export class RatingController {
  constructor(
    private readonly rateItem: RateItemUseCase,
    private readonly getUserRatingsUseCase: GetUserRatingsUseCase,
  ) {}
  
  @Post()
  async rate(
    @Request() req,
    @Body() body: { tmdbId: number; rating: number; comment?: string },
  ) {
    const result = await this.rateItem.execute(
      req.user.sub,
      body.tmdbId,
      body.rating,
      body.comment,
    );
    return { rating: result };
  }

  @Get()
  async getUserRatings(@Request() req) {
    const userId = req.user.sub;
    const ratings = await this.getUserRatingsUseCase.execute(userId);
    return { ratings };
  }
}

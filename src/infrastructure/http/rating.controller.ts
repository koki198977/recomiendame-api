import { Controller, Post, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { RateItemUseCase } from 'src/application/use-cases/rate-item.use-case';
import { GetUserRatingsUseCase } from 'src/application/use-cases/get-user-ratings.use-case';
import { CreateRatingDto } from '../dtos/create-rating.dto';
import { ListQueryDto } from '../dtos/list-query.dto';

@Controller('ratings')
@UseGuards(JwtAuthGuard)
export class RatingController {
  constructor(
    private readonly rateItem: RateItemUseCase,
    private readonly getUserRatingsUseCase: GetUserRatingsUseCase,
  ) {}
  
  @Post()
  async rate(@Request() req, @Body() dto: CreateRatingDto) {
    const result = await this.rateItem.execute(
      req.user.sub,
      dto.tmdbId,
      dto.title!,
      dto.mediaType,
      dto.rating,
      dto.comment,
    );
    return { rating: result };
  }

  @Get()
  async getUserRatings(
    @Request() req,
    @Query() query: ListQueryDto,
  ) {
    const userId = req.user.sub;
    const ratings = await this.getUserRatingsUseCase.execute(userId, query);
    return { ratings };
  }
}

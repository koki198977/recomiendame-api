import { Controller, Post, Get, Body, UseGuards, Request, Query, Delete, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { RateItemUseCase } from 'src/application/use-cases/rate-item.use-case';
import { GetUserRatingsUseCase } from 'src/application/use-cases/get-user-ratings.use-case';
import { CreateRatingDto } from '../dtos/create-rating.dto';
import { ListQueryDto } from '../dtos/list-query.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { RemoveRatingUseCase } from 'src/application/use-cases/remove-rating.use-case';

@Controller('ratings')
@UseGuards(JwtAuthGuard)
export class RatingController {
  constructor(
    private readonly rateItem: RateItemUseCase,
    private readonly getUserRatingsUseCase: GetUserRatingsUseCase,
    private readonly removeRatingUseCase: RemoveRatingUseCase,
  ) {}
  
  @Post()
  async rate(@Request() req, @Body() dto: CreateRatingDto) {
    const result = await this.rateItem.execute(
      req.user.sub,
      dto.tmdbId,
      dto.rating,
      dto.comment,
    );
    return { rating: result };
  }

  @Get()
  async getUserRatings(
    @Request() req,
    @Query('tmdbId') tmdbId?: string,
    @Query('orderBy') orderBy?: 'createdAt' | 'title',
    @Query('order') order?: 'asc' | 'desc',
    @Query('mediaType') mediaType?: 'movie' | 'tv',
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
    @Query('platform') platform?: string,
  ) {
    const userId = req.user.sub;
    
    // If tmdbId is provided, search for that specific rating
    if (tmdbId) {
      const tmdbIdNum = Number(tmdbId);
      // Get all ratings without pagination to search
      const result = await this.getUserRatingsUseCase.execute(userId, { take: 1000 });
      const specificRating = result.items.find(r => r.tmdbId === tmdbIdNum);
      return { 
        rating: specificRating || null,
        hasRating: !!specificRating 
      };
    }
    
    // Build query object for normal listing
    const query: any = {};
    if (orderBy) query.orderBy = orderBy;
    if (order) query.order = order;
    if (mediaType) query.mediaType = mediaType;
    if (skip !== undefined) query.skip = skip;
    if (take !== undefined) query.take = take;
    if (search) query.search = search;
    if (platform) query.platform = platform;
    
    const result = await this.getUserRatingsUseCase.execute(userId, query);
    
    return { 
      ratings: result.items, 
      total: result.total, 
      page: result.page, 
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage
    };
  }

  @Delete(':tmdbId')
  async removeFavoriteHandler(
    @CurrentUser() user: { sub: string },
    @Param('tmdbId') tmdbId: string,
  ) {
    await this.removeRatingUseCase.execute(user.sub, Number(tmdbId));
    return { message: 'Eliminado de ratings' };
  }
}

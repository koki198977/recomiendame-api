// src/infrastructure/controllers/recommendations.controller.ts

import { Controller, Get, Post, UseGuards, Request, Body, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { GenerateRecommendationsUseCase } from 'src/application/use-cases/generate-recommendations.use-case';
import { GetRecommendationsUseCase } from 'src/application/use-cases/get-recommendations.use-case';
import { RecommendationResponse } from 'src/domain/entities/recommendation.response';
import { GetRecommendationHistoryUseCase } from 'src/application/use-cases/get-recommendation-history.use-case';
import { ListQueryDto } from '../dtos/list-query.dto';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(
    private readonly generateRecs: GenerateRecommendationsUseCase,
    private readonly getRecs: GetRecommendationsUseCase,
    private readonly getHistory: GetRecommendationHistoryUseCase,
  ) {}

  @Post()
  async generate(
    @Request() req,
    @Body() body: { feedback?: string; tmdbId?: number }
  ): Promise<{ recommendations: RecommendationResponse[] }> {
    const recommendations = await this.generateRecs.execute(
      req.user.sub, body.feedback, body.tmdbId
    );
    return { recommendations };
  }


  /**  
   * Lista todas las recomendaciones ya generadas  
   */
  @Get()
  async list(@Request() req): Promise<{ recommendations: RecommendationResponse[] }> {
    const recommendations = await this.getRecs.execute(req.user.sub);
    return { recommendations };
  }

  @Get('history')
  async history(
    @Request() req,
    @Query() query: ListQueryDto,
  ) {
    return this.getHistory.execute(req.user.sub, query);
  }
}

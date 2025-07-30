// src/infrastructure/controllers/recommendations.controller.ts
import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { GenerateRecommendationsUseCase } from 'src/application/use-cases/generate-recommendations.use-case';
import { GetRecommendationsUseCase } from 'src/application/use-cases/get-recommendations.use-case';
import { RecommendationResponse } from 'src/domain/entities/recommendation.response';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(
    private readonly generateRecs: GenerateRecommendationsUseCase,
    private readonly getRecs: GetRecommendationsUseCase,
  ) {}

  // Genera y guarda 5 nuevas recomendaciones
  @Post()
  async generate(@Request() req): Promise<{ recommendations: RecommendationResponse[] }> {
    await this.generateRecs.execute(req.user.sub);
    // luego devuelvo el listado enriquecido
    const enriched = await this.getRecs.execute(req.user.sub);
    return { recommendations: enriched };
  }

  // Lista las recomendaciones ya generadas, con todos los campos de Tmdb
  @Get()
  async list(@Request() req): Promise<{ recommendations: RecommendationResponse[] }> {
    const recommendations = await this.getRecs.execute(req.user.sub);
    return { recommendations };
  }
}

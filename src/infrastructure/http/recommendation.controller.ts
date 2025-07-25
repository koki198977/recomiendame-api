import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { GenerateRecommendationsUseCase } from 'src/application/use-cases/generate-recommendations.use-case';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(private readonly generateRecommendations: GenerateRecommendationsUseCase) {}

  @Get()
  async getRecommendations(@Request() req) {
    const userId = req.user.id;
    const recommendations = await this.generateRecommendations.execute(userId);
    return { recommendations };
  }
}

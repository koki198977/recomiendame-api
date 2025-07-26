import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { GetDashboardStatsUseCase } from 'src/application/use-cases/get-dashboard-stats.use-case';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly getStats: GetDashboardStatsUseCase) {}

  @Get('stats')
  async getStatsHandler(@CurrentUser() user: { sub: string }) {
    const stats = await this.getStats.execute(user.sub);
    return { stats };
  }
}

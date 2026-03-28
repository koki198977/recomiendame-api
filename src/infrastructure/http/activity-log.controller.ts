import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { GetActivityLogUseCase } from 'src/application/use-cases/get-activity-log.use-case';
import { GetAllActivityLogUseCase } from 'src/application/use-cases/get-all-activity-log.use-case';
import { AdminGuard } from '../auth/admin.guard';
import { ImplicitFeedbackService } from '../ai/implicit-feedback.service';

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityLogController {
  constructor(
    private readonly getActivity: GetActivityLogUseCase,
    private readonly getAllActivity: GetAllActivityLogUseCase,
    private readonly implicitFeedback: ImplicitFeedbackService,
  ) {}

  @Get()
  async getUserActivity(
    @CurrentUser() user: { sub: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNumber = this.parseNumber(page);
    const limitNumber = this.parseNumber(limit);
    const result = await this.getActivity.execute(user.sub, {
      page: pageNumber,
      limit: limitNumber,
    });
    return { logs: result.data, meta: result.meta };
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  async getAllActivityLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNumber = this.parseNumber(page);
    const limitNumber = this.parseNumber(limit);
    const result = await this.getAllActivity.execute({
      page: pageNumber,
      limit: limitNumber,
    });
    return { logs: result.data, meta: result.meta };
  }

  private parseNumber(value?: string): number | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  /**
   * Registra que el usuario vio (parte de) un tráiler.
   * El frontend llama esto cuando el usuario cierra/pausa el tráiler.
   * Body: { tmdbId: number, watchedSecs: number }
   */
  @Post('trailer-view')
  async recordTrailerView(
    @CurrentUser() user: { sub: string },
    @Body() body: { tmdbId: number; watchedSecs: number },
  ): Promise<{ ok: boolean }> {
    await this.implicitFeedback.recordTrailerView(
      user.sub,
      body.tmdbId,
      body.watchedSecs ?? 0,
    );
    return { ok: true };
  }
}

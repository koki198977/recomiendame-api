import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { GetActivityLogUseCase } from 'src/application/use-cases/get-activity-log.use-case';
import { GetAllActivityLogUseCase } from 'src/application/use-cases/get-all-activity-log.use-case';
import { AdminGuard } from '../auth/admin.guard';

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityLogController {
  constructor(
    private readonly getActivity: GetActivityLogUseCase,
    private readonly getAllActivity: GetAllActivityLogUseCase,
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
}

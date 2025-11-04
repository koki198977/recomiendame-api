import { Controller, Get, UseGuards } from '@nestjs/common';
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
  async getUserActivity(@CurrentUser() user: { sub: string }) {
    const logs = await this.getActivity.execute(user.sub);
    return { logs };
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  async getAllActivityLogs() {
    const logs = await this.getAllActivity.execute();
    return { logs };
  }
}

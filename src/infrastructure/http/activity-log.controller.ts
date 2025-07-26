import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { GetActivityLogUseCase } from 'src/application/use-cases/get-activity-log.use-case';

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityLogController {
  constructor(private readonly getActivity: GetActivityLogUseCase) {}

  @Get()
  async getUserActivity(@CurrentUser() user: { sub: string }) {
    const logs = await this.getActivity.execute(user.sub);
    return { logs };
  }
}

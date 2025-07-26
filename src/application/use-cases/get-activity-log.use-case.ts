import { Inject, Injectable } from '@nestjs/common';
import { ACTIVITY_LOG_REPOSITORY, ActivityLogRepository } from '../ports/activity-log.repository';
import { ActivityLog } from 'src/domain/entities/activity-log';

@Injectable()
export class GetActivityLogUseCase {
  constructor(
    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityRepo: ActivityLogRepository,
  ) {}

  async execute(userId: string): Promise<ActivityLog[]> {
    return this.activityRepo.getUserActivity(userId);
  }
}

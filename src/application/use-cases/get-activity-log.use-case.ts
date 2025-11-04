import { Inject, Injectable } from '@nestjs/common';
import { ACTIVITY_LOG_REPOSITORY, ActivityLogRepository } from '../ports/activity-log.repository';
import { ActivityLog } from 'src/domain/entities/activity-log';

@Injectable()
export class GetActivityLogUseCase {
  constructor(
    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityRepo: ActivityLogRepository,
  ) {}

  async execute(
    userId: string,
    params?: { page?: number; limit?: number },
  ): Promise<{ data: ActivityLog[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(Math.max(1, params?.limit ?? 50), 100);
    const skip = (page - 1) * limit;

    const { data, total } = await this.activityRepo.getUserActivity(userId, { skip, take: limit });
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }
}

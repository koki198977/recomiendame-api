import { ActivityLog } from "src/domain/entities/activity-log";

export const ACTIVITY_LOG_REPOSITORY = Symbol('ACTIVITY_LOG_REPOSITORY');

export interface ActivityLogRepository {
  log(activity: ActivityLog): Promise<void>;
  getUserActivity(userId: string): Promise<ActivityLog[]>;
}

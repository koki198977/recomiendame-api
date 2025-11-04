// src/infrastructure/repositories/activity-log.repository.impl.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogRepository } from 'src/application/ports/activity-log.repository';
import { ActivityLog } from 'src/domain/entities/activity-log';

@Injectable()
export class ActivityLogRepositoryImpl implements ActivityLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async log(activity: ActivityLog): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        userId: activity.userId,
        action: activity.action,
        tmdbId: activity.tmdbId,
        details: activity.details,
      },
    });
  }

  async getUserActivity(userId: string): Promise<ActivityLog[]> {
    const logs = await this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((log) => this.mapToDomain(log));
  }

  async getAll(): Promise<ActivityLog[]> {
    const logs = await this.prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((log) => this.mapToDomain(log));
  }

  private mapToDomain(log: {
    id: string;
    userId: string;
    action: string;
    tmdbId: number;
    details: string | null;
    createdAt: Date;
  }): ActivityLog {
    return new ActivityLog(
      log.id,
      log.userId,
      log.action,
      log.tmdbId,
      log.details ?? undefined,
      log.createdAt,
    );
  }
}

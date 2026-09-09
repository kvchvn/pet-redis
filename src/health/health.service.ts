import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { DependencyStatus, HealthCheck } from './health.types';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async check(): Promise<HealthCheck> {
    const result: HealthCheck = {
      postgres: await this.checkPostgres(),
      redis: await this.checkRedis(),
    };

    if (result.postgres === 'down' || result.redis === 'down') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }

  private async checkPostgres(): Promise<DependencyStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      await this.cache.ping();
      return 'up';
    } catch {
      return 'down';
    }
  }
}

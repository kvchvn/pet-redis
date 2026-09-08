import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthCheck } from './health.types';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheck> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { postgres: 'up' };
    } catch {
      throw new ServiceUnavailableException({
        postgres: 'down',
      } satisfies HealthCheck);
    }
  }
}

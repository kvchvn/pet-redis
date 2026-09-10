import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthorsModule } from './authors/authors.module';
import { BooksModule } from './books/books.module';
import { CacheModule } from './cache/cache.module';
import { CategoriesModule } from './categories/categories.module';
import { AppEnv, validateEnv } from './config/env.validation';
import { createPinoParams } from './config/pino';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) =>
        createPinoParams(config.get('LOG_LEVEL', { infer: true })),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) => ({
        throttlers: [
          {
            ttl: seconds(config.get('THROTTLE_TTL_SECONDS', { infer: true })),
            limit: config.get('THROTTLE_LIMIT', { infer: true }),
          },
        ],
      }),
    }),
    PrismaModule,
    CacheModule,
    EventsModule,
    HealthModule,
    AuthorsModule,
    CategoriesModule,
    BooksModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { MetricsController } from './metrics.controller';
import { metricsProviders } from './metrics.providers';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      controller: MetricsController,
      defaultMetrics: {
        enabled: true,
      },
      defaultLabels: {
        app: 'bookstore-api',
      },
    }),
  ],
  providers: [
    ...metricsProviders,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
  exports: [...metricsProviders, PrometheusModule],
})
export class MetricsModule {}

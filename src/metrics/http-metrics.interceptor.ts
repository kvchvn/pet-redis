import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Request } from 'express';
import { Histogram, Counter } from 'prom-client';
import { catchError, Observable, tap, throwError } from 'rxjs';
import {
  HTTP_REQUEST_DURATION_SECONDS,
  HTTP_REQUESTS_TOTAL,
  METRICS_SKIP_PATHS,
} from './metrics.constants';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric(HTTP_REQUESTS_TOTAL)
    private readonly requests: Counter<string>,
    @InjectMetric(HTTP_REQUEST_DURATION_SECONDS)
    private readonly duration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    if (METRICS_SKIP_PATHS.has(request.path)) {
      return next.handle();
    }

    const started = process.hrtime.bigint();

    const record = (statusCode: number) => {
      const labels = {
        method: request.method,
        // request.route is not typed
        // eslint-disable-next-line
        route: request.route?.path ?? 'unmatched',
        status: String(statusCode),
      };
      const seconds = Number(process.hrtime.bigint() - started) / 1e9;

      this.requests.inc(labels);
      this.duration.observe(labels, seconds);
    };

    return next.handle().pipe(
      tap(() => {
        const response = context
          .switchToHttp()
          .getResponse<{ statusCode: number }>();
        record(response.statusCode);
      }),
      catchError((error: unknown) => {
        record(error instanceof HttpException ? error.getStatus() : 500);
        return throwError(() => error);
      }),
    );
  }
}

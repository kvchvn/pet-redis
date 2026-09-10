import {
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import {
  BOOK_EVENTS_TOTAL,
  CACHE_REQUESTS_TOTAL,
  HTTP_REQUEST_DURATION_SECONDS,
  HTTP_REQUESTS_TOTAL,
} from './metrics.constants';

export const metricsProviders = [
  makeCounterProvider({
    name: HTTP_REQUESTS_TOTAL,
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
  }),
  makeHistogramProvider({
    name: HTTP_REQUEST_DURATION_SECONDS,
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  }),
  makeCounterProvider({
    name: CACHE_REQUESTS_TOTAL,
    help: 'Book list cache lookups',
    labelNames: ['result'],
  }),
  makeCounterProvider({
    name: BOOK_EVENTS_TOTAL,
    help: 'Book mutation events written to Redis',
    labelNames: ['type'],
  }),
];

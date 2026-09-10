export const HTTP_REQUESTS_TOTAL = 'http_requests_total';
export const HTTP_REQUEST_DURATION_SECONDS = 'http_request_duration_seconds';
export const CACHE_REQUESTS_TOTAL = 'bookstore_cache_requests_total';
export const BOOK_EVENTS_TOTAL = 'bookstore_book_events_total';

export const METRICS_SKIP_PATHS = new Set([
  '/health',
  '/metrics',
  '/books/events/live',
]);

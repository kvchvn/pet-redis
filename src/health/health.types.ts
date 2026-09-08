export type PostgresStatus = 'up' | 'down';

export type HealthCheck = {
  postgres: PostgresStatus;
};

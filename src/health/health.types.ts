export type DependencyStatus = 'up' | 'down';

export type HealthCheck = {
  postgres: DependencyStatus;
  redis: DependencyStatus;
};

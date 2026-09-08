type AppEnv = {
  DATABASE_URL: string;
  PORT: number;
};

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const databaseUrl = config.DATABASE_URL;

  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL is required');
  }

  const parsedPort = config.PORT === undefined ? 3000 : Number(config.PORT);

  if (Number.isNaN(parsedPort) || parsedPort <= 0) {
    throw new Error('PORT must be a positive number');
  }

  return {
    DATABASE_URL: databaseUrl,
    PORT: parsedPort,
  };
}

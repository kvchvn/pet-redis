import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().int().positive().default(3001),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  return envSchema.parse(config);
}

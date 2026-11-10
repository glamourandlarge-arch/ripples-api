import { z } from 'zod';
import { parsePeers } from '../integrations/parse-peers.js';

const booleanFlag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive(),
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive(),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_SSL: booleanFlag,
  CORS_ORIGIN: z.string().min(1),
  HTTP_TRUST_PROXY: z.string().default('false'),
  SWAGGER_ENABLED: booleanFlag,
  SERVICE_NAME: z.string().min(1),
  SERVICE_SHARED_SECRET: z.string().min(1),
  PEERS: z
    .string()
    .default('')
    .transform((value, ctx) => {
      try {
        return parsePeers(value);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Invalid PEERS';
        ctx.addIssue(message);
        return z.NEVER;
      }
    }),
  MESSAGING_ENABLED: booleanFlag,
  MESSAGING_TRANSPORT: z.enum(['tcp', 'redis']).default('tcp'),
  MESSAGING_HOST: z.string().min(1).default('127.0.0.1'),
  MESSAGING_PORT: z.coerce.number().int().positive().default(8001),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+(ms|s|m|h|d)$/)
    .default('1h'),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_DEBUG: booleanFlag,
  OTP_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  OTP_RATE_LIMIT_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(900),
  REGIONS_SEED_ON_BOOT: booleanFlag,
  REGIONS_DATA_URL: z
    .string()
    .url()
    .default(
      'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries+states+cities.json',
    ),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${details}`);
  }

  return result.data;
}

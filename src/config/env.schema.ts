import { z } from 'zod';
import { parsePeers } from '../integrations/parse-peers.js';

const booleanFlag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive(),
  MONGODB_URI: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),
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

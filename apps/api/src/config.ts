import { z } from "zod";

export const configSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  HUMAN_TRANSFER_PHONE_NUMBER: z.string().optional(),
  ADMIN_DEMO_TOKEN: z.string().default("change-me"),
  DATA_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  TRANSCRIPT_CONSENT_REQUIRED: z.coerce.boolean().default(true),
  NODE_ENV: z.string().default("development")
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse(env);
}


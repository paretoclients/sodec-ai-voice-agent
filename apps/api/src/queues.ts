import { Queue, type ConnectionOptions } from "bullmq";
import type { AppConfig } from "./config.js";

export function parseRedisConnection(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null
  };
}

export function createQueues(config: AppConfig): {
  whatsappVoiceQueue: Queue;
  connection: ConnectionOptions;
} {
  const connection = parseRedisConnection(config.REDIS_URL);
  return {
    connection,
    whatsappVoiceQueue: new Queue("whatsapp-voice-notes", { connection })
  };
}

import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { AppConfig } from "./config.js";

export function createQueues(config: AppConfig): {
  whatsappVoiceQueue: Queue;
  connection: IORedis;
} {
  const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });
  return {
    connection,
    whatsappVoiceQueue: new Queue("whatsapp-voice-notes", { connection })
  };
}


import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import Fastify, { type FastifyInstance } from "fastify";
import { loadConfig } from "./config.js";
import { bridgeMediaStream } from "./realtime.js";
import { bearerTokenIsValid, assertTwilioSignature, type FormBody } from "./security.js";
import { buildVoiceTwiMl, buildWhatsappTwiMl } from "./twilio.js";

export type BuildAppOptions = {
  validateTwilio?: boolean;
  testMode?: boolean;
};

function xmlReply(xml: string): { body: string; contentType: string } {
  return { body: xml, contentType: "text/xml; charset=utf-8" };
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = loadConfig();
  const app = Fastify({
    logger: options.testMode
      ? false
      : {
          redact: ["req.headers.authorization", "req.headers.x-twilio-signature"]
        }
  });

  await app.register(cors, { origin: true });
  await app.register(formbody);
  await app.register(websocket);
  await app.register(rateLimit, {
    max: 120,
    timeWindow: options.testMode ? 1000 : "1 minute",
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true
    }
  });

  app.get("/health", async () => ({ ok: true, service: "sodec-ai-voice-agent" }));

  app.post<{ Body: FormBody }>("/webhooks/twilio/voice", async (request, reply) => {
    if (
      options.validateTwilio !== false &&
      !assertTwilioSignature(request, config.PUBLIC_BASE_URL, config.TWILIO_AUTH_TOKEN)
    ) {
      return reply.code(403).send({ error: "invalid_twilio_signature" });
    }

    const twiml = buildVoiceTwiMl(request.body ?? {}, config);
    const response = xmlReply(twiml);
    return reply.type(response.contentType).send(response.body);
  });

  app.post<{ Body: FormBody }>("/webhooks/twilio/whatsapp", async (request, reply) => {
    if (
      options.validateTwilio !== false &&
      !assertTwilioSignature(request, config.PUBLIC_BASE_URL, config.TWILIO_AUTH_TOKEN)
    ) {
      return reply.code(403).send({ error: "invalid_twilio_signature" });
    }

    const twiml = buildWhatsappTwiMl(request.body ?? {});
    const response = xmlReply(twiml);
    return reply.type(response.contentType).send(response.body);
  });

  app.get("/twilio/media-stream", { websocket: true }, (socket) => {
    bridgeMediaStream(socket, config);
  });

  app.get("/admin/overview", async (request, reply) => {
    if (!bearerTokenIsValid(request.headers.authorization, config.ADMIN_DEMO_TOKEN)) {
      return reply.code(401).send({ error: "admin_auth_required" });
    }

    return {
      workflows: [
        { intent: "loan_prequalification", channel: "PHONE", active: true },
        { intent: "collections", channel: "PHONE", active: true },
        { intent: "whatsapp_voice_banking", channel: "WHATSAPP", active: true },
        { intent: "sme_financing", channel: "PHONE", active: true }
      ],
      retentionDays: config.DATA_RETENTION_DAYS,
      transcriptConsentRequired: config.TRANSCRIPT_CONSENT_REQUIRED
    };
  });

  return app;
}

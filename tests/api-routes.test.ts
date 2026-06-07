import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../apps/api/src/app.js";

describe("Fastify API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.ADMIN_DEMO_TOKEN = "admin-token";
    process.env.PUBLIC_BASE_URL = "https://demo.sodec.local";
    process.env.TWILIO_AUTH_TOKEN = "test-token";
    app = await buildApp({ validateTwilio: false, testMode: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns a health response", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, service: "sodec-ai-voice-agent" });
  });

  it("rejects Twilio webhooks without a valid signature", async () => {
    const signedApp = await buildApp({ validateTwilio: true, testMode: true });

    const response = await signedApp.inject({
      method: "POST",
      url: "/webhooks/twilio/voice",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "From=%2B24177123456&CallSid=CA123"
    });
    void signedApp.close();

    expect(response.statusCode).toBe(403);
  });

  it("returns TwiML that connects voice calls to the media stream", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/webhooks/twilio/voice",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "From=%2B24177123456&CallSid=CA123&SpeechResult=credit%20personnel"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/xml");
    expect(response.body).toContain("wss://demo.sodec.local/twilio/media-stream");
    expect(response.body).toContain("préqualification");
    expect(response.body).not.toContain("approbation");
  });

  it("accepts WhatsApp voice-note webhook payloads", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/webhooks/twilio/whatsapp",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "From=whatsapp%3A%2B24177123456&MessageSid=SM123&NumMedia=1&MediaUrl0=https%3A%2F%2Fexample.com%2Fvoice.ogg"
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Message vocal reçu");
  });

  it("protects admin routes with a demo token placeholder", async () => {
    const denied = await app.inject({ method: "GET", url: "/admin/overview" });
    const allowed = await app.inject({
      method: "GET",
      url: "/admin/overview",
      headers: { authorization: "Bearer admin-token" }
    });

    expect(denied.statusCode).toBe(401);
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json().workflows).toHaveLength(4);
  });
});

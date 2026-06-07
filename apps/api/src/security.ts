import crypto from "node:crypto";
import type { FastifyRequest } from "fastify";
import twilio from "twilio";
import { maskPii } from "../../../packages/shared/src/index.js";

export type FormBody = Record<string, string | undefined>;

export function maskLogFields(value: unknown): unknown {
  if (typeof value === "string") {
    return maskPii(value);
  }
  if (Array.isArray(value)) {
    return value.map(maskLogFields);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, fieldValue]) => [key, maskLogFields(fieldValue)])
    );
  }
  return value;
}

export function hashPhone(phone: string): string {
  return crypto.createHash("sha256").update(phone).digest("hex");
}

export function assertTwilioSignature(
  request: FastifyRequest<{ Body: FormBody }>,
  publicBaseUrl: string,
  authToken?: string
): boolean {
  if (!authToken) {
    return false;
  }

  const signature = request.headers["x-twilio-signature"];
  if (typeof signature !== "string") {
    return false;
  }

  const url = `${publicBaseUrl}${request.url}`;
  return twilio.validateRequest(authToken, signature, url, request.body ?? {});
}

export function bearerTokenIsValid(header: string | undefined, token: string): boolean {
  return header === `Bearer ${token}`;
}


import twilio from "twilio";
import {
  buildSystemPrompt,
  detectIntent,
  getNextQuestion,
  type ConversationContext
} from "../../../packages/shared/src/index.js";
import type { AppConfig } from "./config.js";
import type { FormBody } from "./security.js";

function toWsUrl(publicBaseUrl: string): string {
  const url = new URL(publicBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/twilio/media-stream";
  url.search = "";
  return url.toString();
}

export function buildVoiceTwiMl(body: FormBody, config: AppConfig): string {
  const response = new twilio.twiml.VoiceResponse();
  const speech = body.SpeechResult ?? "";
  const intentResult = detectIntent(speech);
  const context: ConversationContext = {
    intent: intentResult.intent === "unknown" ? "loan_prequalification" : intentResult.intent,
    transcriptConsent: config.TRANSCRIPT_CONSENT_REQUIRED ? false : true,
    identityVerified: false,
    collectedFields: {}
  };
  const question = getNextQuestion(context);

  response.say(
    { language: "fr-FR", voice: "Polly.Celine" },
    `Bonjour et bienvenue chez SODEC Gabon. ${question.text}`
  );
  const connect = response.connect();
  connect.stream({
    url: toWsUrl(config.PUBLIC_BASE_URL),
    name: "sodec-openai-realtime"
  });
  response.pause({ length: 1 });
  response.say(
    { language: "fr-FR", voice: "Polly.Celine" },
    buildSystemPrompt(context.intent).slice(0, 280)
  );

  return response.toString();
}

export function buildWhatsappTwiMl(body: FormBody): string {
  const response = new twilio.twiml.MessagingResponse();
  const hasVoiceNote = Number(body.NumMedia ?? 0) > 0 && Boolean(body.MediaUrl0);

  response.message(
    hasVoiceNote
      ? "Message vocal reçu. Je traite votre demande en français et je prépare la prochaine étape avec un conseiller SODEC."
      : "Bonjour et bienvenue chez SODEC Gabon. Vous pouvez envoyer votre demande par message vocal WhatsApp, et un conseiller virtuel vous accompagnera dans vos démarches."
  );

  return response.toString();
}

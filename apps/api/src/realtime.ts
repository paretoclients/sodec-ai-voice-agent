import WebSocket from "ws";
import type { AppConfig } from "./config.js";

type TwilioSocket = {
  on(event: "message", listener: (message: Buffer | string) => void): void;
  on(event: "close", listener: () => void): void;
  send(message: string): void;
};

export function bridgeMediaStream(twilioSocket: TwilioSocket, config: AppConfig): void {
  if (!config.OPENAI_API_KEY) {
    twilioSocket.send(JSON.stringify({ event: "error", message: "OPENAI_API_KEY missing" }));
    return;
  }

  const realtime = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-realtime", {
    headers: {
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      "OpenAI-Beta": "realtime=v1"
    }
  });

  realtime.on("open", () => {
    realtime.send(
      JSON.stringify({
        type: "session.update",
        session: {
          instructions:
            "Vous êtes un conseiller virtuel SODEC Gabon. Répondez uniquement en français naturel, avec un ton chaleureux, professionnel et adapté au contexte gabonais. Posez une seule question à la fois. Pour toute demande de crédit ou de financement, parlez de préqualification, jamais d'approbation, et ne garantissez jamais de financement. Pour le recouvrement, vérifiez l'identité avant toute information de paiement. Proposez un transfert humain en cas de fraude, sujet juridique, colère, maladie, décès, litige ou demande explicite.",
          modalities: ["text", "audio"],
          voice: "alloy"
        }
      })
    );
  });

  twilioSocket.on("message", (message) => {
    if (realtime.readyState === WebSocket.OPEN) {
      realtime.send(message.toString());
    }
  });

  realtime.on("message", (message) => {
    twilioSocket.send(message.toString());
  });

  twilioSocket.on("close", () => realtime.close());
}

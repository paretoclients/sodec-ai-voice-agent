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
            "Vous êtes l'agent vocal IA SODEC Gabon. Répondez en français uniquement, une question à la fois.",
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


import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { sodecAgents, type SodecAgentKey } from "@sodec/shared";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequest = {
  agent: SodecAgentKey;
  messages: ChatMessage[];
};

function fallbackReply(agent: (typeof sodecAgents)[SodecAgentKey], lastUserMessage: string): string {
  const lower = lastUserMessage.toLocaleLowerCase("fr");
  if (/conseiller|humain|fraude|avocat|litige|conteste|malade|décès|decede|furieux/.test(lower)) {
    return "Je comprends. Pour votre sécurité, je vais préparer un transfert vers un conseiller SODEC. Pouvez-vous me confirmer votre nom complet ?";
  }
  if (agent.key === "collections") {
    return "Avant de parler de votre dossier, je dois confirmer votre identité. Pouvez-vous me donner votre nom complet ?";
  }
  if (agent.key === "sme") {
    return "Merci. Pour cette préqualification PME, quel est le nom de votre entreprise au Gabon ?";
  }
  if (agent.key === "whatsapp") {
    return "Merci pour votre message. Quelle opération bancaire souhaitez-vous simuler sur WhatsApp ?";
  }
  return "Merci. Il s'agit d'une préqualification, pas d'une approbation. Quel est l'objet de votre demande de financement ?";
}

function isAgentKey(value: string): value is SodecAgentKey {
  return value in sodecAgents;
}

async function loadKnowledge(fileName: string): Promise<string> {
  return readFile(path.join(process.cwd(), "../../knowledge-base", fileName), "utf8");
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
  }

  const body = (await request.json()) as ChatRequest;
  if (!isAgentKey(body.agent)) {
    return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
  }

  const agent = sodecAgents[body.agent];
  const knowledge = await loadKnowledge(agent.knowledgeFile);
  const messages = [
    {
      role: "system",
      content: `${agent.systemPrompt}

Base de connaissances:
${knowledge}

Règles absolues: français uniquement, une question à la fois, pas d'approbation de prêt, pas de garantie de financement, escalade humaine pour fraude, juridique, colère, maladie, décès, litige de paiement ou demande explicite.`
    },
    ...body.messages.slice(-10)
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.35,
      messages
    })
  });

  if (!response.ok) {
    const lastUserMessage = [...body.messages].reverse().find((message) => message.role === "user");
    return NextResponse.json({
      content: fallbackReply(agent, lastUserMessage?.content ?? ""),
      providerStatus: `openai_unavailable_${response.status}`
    });
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content =
    payload.choices?.[0]?.message?.content ??
    "Je n'ai pas pu répondre correctement. Je peux vous transférer à un conseiller SODEC.";

  return NextResponse.json({ content });
}

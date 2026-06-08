import { NextResponse } from "next/server";
import {
  createEmptyFields,
  knowledgeBase,
  sodecAgents,
  type FlowPhase,
  type SodecAgentKey
} from "../../../lib/sodec-agents";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequest = {
  agent: SodecAgentKey;
  messages: ChatMessage[];
  fields?: Record<string, string>;
};

type AdvisorReply = {
  content: string;
  phase: FlowPhase;
  progress: number;
  fields: Record<string, string>;
  summary: string;
  nextAction: string;
  readyToFinalize: boolean;
  escalationReason: string | null;
};

const defaultModel = "gpt-5.5";

function isAgentKey(value: string): value is SodecAgentKey {
  return value in sodecAgents;
}

function fallbackReply(agentKey: SodecAgentKey, fields: Record<string, string>, lastUserMessage: string): AdvisorReply {
  const agent = sodecAgents[agentKey];
  const lower = lastUserMessage.toLocaleLowerCase("fr");
  const escalation = /conseiller|humain|fraude|avocat|litige|conteste|malade|décès|deces|furieux/.test(lower);
  const mergedFields = { ...createEmptyFields(agent), ...fields };
  const filledCount = Object.values(mergedFields).filter(Boolean).length;
  const progress = Math.min(95, Math.round((filledCount / agent.steps.length) * 100));

  if (escalation) {
    return {
      content:
        "Je comprends. Votre demande mérite l'attention d'un conseiller SODEC. Je vais préparer une synthèse de l'échange pour faciliter le transfert. Pouvez-vous me confirmer votre nom complet ?",
      phase: "transfert",
      progress,
      fields: mergedFields,
      summary: "Transfert humain recommandé à la suite d'un signal sensible ou d'une demande explicite.",
      nextAction: "Transférer vers un conseiller SODEC",
      readyToFinalize: true,
      escalationReason: "human_transfer"
    };
  }

  const nextStep = agent.steps.find((step) => !mergedFields[step.field]) ?? agent.steps[agent.steps.length - 1];
  return {
    content:
      nextStep?.label === "Rendez-vous" || nextStep?.label === "Suivi"
        ? "Merci, j'ai les éléments principaux. Quel créneau vous conviendrait pour qu'un conseiller SODEC reprenne ce dossier avec vous ?"
        : `${agent.openingQuestion} Je vais avancer avec vous étape par étape, en gardant bien à l'esprit qu'il s'agit d'une préqualification.`,
    phase: progress >= 80 ? "synthese" : "qualification",
    progress,
    fields: mergedFields,
    summary: "Synthèse en cours de préparation à partir des informations collectées.",
    nextAction: "Poursuivre la qualification",
    readyToFinalize: progress >= 80,
    escalationReason: null
  };
}

function extractJson(text: string): AdvisorReply | null {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/u, "");
  try {
    return JSON.parse(cleaned) as AdvisorReply;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/u);
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(match[0]) as AdvisorReply;
    } catch {
      return null;
    }
  }
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
  const currentFields = { ...createEmptyFields(agent), ...(body.fields ?? {}) };
  const lastUserMessage = [...body.messages].reverse().find((message) => message.role === "user");
  const knowledge = knowledgeBase[agent.knowledgeFile];
  const model = process.env.OPENAI_CHAT_MODEL ?? defaultModel;

  const systemPrompt = `${agent.systemPrompt}

Base de connaissances:
${knowledge}

Règles de conversation:
- Français impeccable avec accents, ton gabonais chaleureux, bancaire et respectueux.
- Répondre comme un conseiller SODEC, pas comme un chatbot.
- Une seule question à la fois.
- Maintenir la mémoire de l'échange et utiliser les informations déjà collectées.
- Gérer les interruptions naturellement, puis reprendre le fil.
- Pour un crédit ou financement: toujours dire préqualification, jamais approbation; ne jamais garantir un accord.
- Pour le recouvrement: ne jamais mentionner de détail de paiement avant vérification d'identité.
- Escalader vers un humain pour fraude, juridique, colère, maladie, décès, litige de paiement ou demande explicite.
- Quand les informations clés sont suffisantes, produire une synthèse concise et proposer la finalisation du dossier.

Tu dois répondre uniquement en JSON valide selon ce format:
{
  "content": "réponse client naturelle en 1 à 4 phrases",
  "phase": "accueil | qualification | verification | synthese | finalisation | transfert",
  "progress": 0,
  "fields": { "champ": "valeur collectée ou vide" },
  "summary": "synthèse opérationnelle du dossier",
  "nextAction": "action suivante",
  "readyToFinalize": false,
  "escalationReason": null
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      ...(model.startsWith("gpt-5") ? {} : { temperature: 0.45 }),
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Agent: ${agent.title}
Champs suivis: ${JSON.stringify(currentFields)}
Conversation récente:
${body.messages
  .slice(-14)
  .map((message) => `${message.role === "user" ? "Client" : "Conseiller"}: ${message.content}`)
  .join("\n")}`
        }
      ]
    })
  });

  if (!response.ok) {
    return NextResponse.json({
      ...fallbackReply(body.agent, currentFields, lastUserMessage?.content ?? ""),
      providerStatus: `openai_unavailable_${response.status}`,
      model
    });
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const parsed = extractJson(payload.choices?.[0]?.message?.content ?? "");
  if (!parsed) {
    return NextResponse.json({
      ...fallbackReply(body.agent, currentFields, lastUserMessage?.content ?? ""),
      providerStatus: "openai_json_parse_failed",
      model
    });
  }

  return NextResponse.json({
    ...parsed,
    fields: { ...currentFields, ...parsed.fields },
    progress: Math.max(0, Math.min(100, parsed.progress)),
    model
  });
}

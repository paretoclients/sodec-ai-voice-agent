export type Intent =
  | "loan_prequalification"
  | "collections"
  | "sme_financing"
  | "whatsapp_voice_banking"
  | "unknown";

export type SodecAgentKey = "loan" | "collections" | "whatsapp" | "sme";

export type SodecAgentProfile = {
  key: SodecAgentKey;
  title: string;
  channel: "Téléphone" | "WhatsApp" | "Web";
  envName: string;
  knowledgeFile: string;
  firstMessage: string;
  systemPrompt: string;
  openingQuestion: string;
};

export const sodecAgents: Record<SodecAgentKey, SodecAgentProfile> = {
  loan: {
    key: "loan",
    title: "Préqualification particulier",
    channel: "Téléphone",
    envName: "ELEVENLABS_AGENT_LOAN_ID",
    knowledgeFile: "loan-prequalification.md",
    firstMessage:
      "Bonjour et bienvenue chez SODEC Gabon. Je vais vous aider à préparer une préqualification pour votre demande de crédit. Pour commencer, pouvez-vous me donner votre nom et votre prénom ?",
    openingQuestion:
      "Quel montant souhaitez-vous demander, et pour quel besoin principal ?",
    systemPrompt:
      "Tu es l’agent vocal SODEC Gabon spécialisé dans la préqualification des demandes de crédit pour les particuliers. Tu aides les clients à préparer leur dossier avant analyse par un conseiller humain. Tu utilises toujours les termes préqualification et étude de dossier. Tu n’utilises jamais approbation ni crédit accepté. Tu poses une seule question à la fois."
  },
  collections: {
    key: "collections",
    title: "Recouvrement et promesse de paiement",
    channel: "Téléphone",
    envName: "ELEVENLABS_AGENT_COLLECTIONS_ID",
    knowledgeFile: "collections-payment-promise.md",
    firstMessage:
      "Bonjour, vous êtes en relation avec SODEC Gabon. Avant toute discussion sur votre dossier, je dois vérifier votre identité. Pouvez-vous me confirmer votre nom complet ?",
    openingQuestion:
      "Pouvez-vous confirmer votre nom complet avant que nous parlions de votre dossier ?",
    systemPrompt:
      "Tu es l’agent vocal SODEC Gabon pour le recouvrement. Tu restes respectueux, humain et professionnel. Tu vérifies l’identité avant de parler de paiement. Tu ne menaces jamais, tu ne culpabilises jamais et tu n’évoques jamais de détail de paiement avant la vérification. En cas de litige, tu escalades immédiatement."
  },
  whatsapp: {
    key: "whatsapp",
    title: "Banque vocale WhatsApp",
    channel: "WhatsApp",
    envName: "ELEVENLABS_AGENT_WHATSAPP_ID",
    knowledgeFile: "whatsapp-voice-banking.md",
    firstMessage:
      "Bonjour et bienvenue chez SODEC Gabon.\n\nJe suis votre assistant virtuel et je peux vous aider pour une demande de crédit, un financement d’activité, des informations sur nos agences ou la prise de rendez-vous avec un conseiller.\n\nComment puis-je vous aider aujourd’hui ?",
    openingQuestion: "Quelle opération souhaitez-vous simuler aujourd'hui sur WhatsApp ?",
    systemPrompt:
      "Tu es l’assistant WhatsApp vocal de SODEC Gabon. Tu échanges comme si tu répondais à de vraies notes vocales. Tu peux aider pour le crédit, le financement PME, les informations agence, le rendez-vous et les questions générales. Tu ne demandes jamais de mot de passe, OTP ou code de sécurité."
  },
  sme: {
    key: "sme",
    title: "Financement PME",
    channel: "Téléphone",
    envName: "ELEVENLABS_AGENT_SME_ID",
    knowledgeFile: "sme-financing-intake.md",
    firstMessage:
      "Bonjour et bienvenue chez SODEC Gabon. Je vais vous aider à préparer votre demande de financement pour votre activité. Pour commencer, quel est le nom de votre entreprise ou de votre activité ?",
    openingQuestion: "Quel est le nom de votre entreprise, et dans quelle ville exercez-vous ?",
    systemPrompt:
      "Tu es l’agent virtuel SODEC Gabon spécialisé dans la préqualification des demandes de financement PME, TPE et entrepreneurs. Tu parles uniquement en français, avec un ton chaleureux, professionnel et naturel, adapté au contexte gabonais. Tu aides un entrepreneur à préparer une demande de financement avant la prise en charge par un conseiller humain. Tu ne garantis jamais un financement. Tu ne promets jamais une approbation. Tu poses une seule question à la fois."
  }
};

export type ConversationContext = {
  intent: Intent;
  transcriptConsent: boolean;
  identityVerified: boolean;
  collectedFields: Record<string, string>;
};

const intentKeywords: Record<Intent, RegExp[]> = {
  loan_prequalification: [
    /\b(cr[eé]dit|pr[eê]t|emprunt)\b/i,
    /\b(personnel|particulier|salari[eé])\b/i
  ],
  collections: [
    /\b(retard|rappel|[eé]ch[eé]ance|recouvrement|impay[eé])\b/i,
    /\b(payer|paiement|promesse)\b/i
  ],
  sme_financing: [
    /\b(pme|entreprise|commerce|soci[eé]t[eé]|stock|fonds de roulement)\b/i,
    /\b(financement|tr[eé]sorerie|investissement)\b/i
  ],
  whatsapp_voice_banking: [/\b(solde|virement|compte|whatsapp|message vocal)\b/i],
  unknown: []
};

export function detectIntent(_text: string): {
  intent: Intent;
  confidence: number;
  language: "fr";
  disallowedTerms: string[];
} {
  const text = _text.toLocaleLowerCase("fr");
  const scores = Object.entries(intentKeywords).map(([intent, patterns]) => ({
    intent: intent as Intent,
    score: patterns.filter((pattern) => pattern.test(text)).length
  }));
  const best = scores.sort((left, right) => right.score - left.score)[0];

  if (best && best.score > 0 && best.intent !== "unknown") {
    return {
      intent: best.intent,
      confidence: Math.min(0.55 + best.score * 0.2, 0.95),
      language: "fr",
      disallowedTerms: []
    };
  }

  return {
    intent: "unknown",
    confidence: 0.25,
    language: "fr",
    disallowedTerms: []
  };
}

const escalationRules: Array<{ reason: string; pattern: RegExp }> = [
  { reason: "fraud", pattern: /\b(fraude|frauduleux|usurpation|pirat[eé])\b/i },
  { reason: "legal", pattern: /\b(avocat|tribunal|justice|plainte|proc[eè]s)\b/i },
  { reason: "anger", pattern: /\b(furieux|col[eè]re|scandale|insulte|arnaque)\b/i },
  { reason: "illness", pattern: /\b(malade|h[oô]pital|hospitalis[eé]|urgence m[eé]dicale)\b/i },
  { reason: "death", pattern: /\b(d[eé]c[eé]d[eé]|mort|d[eé]c[eè]s)\b/i },
  { reason: "payment_dispute", pattern: /\b(conteste|litige|dispute|pas d'accord|erreur de paiement)\b/i },
  { reason: "human_request", pattern: /\b(conseiller|agent humain|humain|responsable|superviseur)\b/i }
];

export function mustEscalate(_text: string): { escalate: boolean; reason: string | null } {
  const match = escalationRules.find((rule) => rule.pattern.test(_text));
  if (match) {
    return { escalate: true, reason: match.reason };
  }

  return { escalate: false, reason: null };
}

export function getNextQuestion(_context: ConversationContext): {
  text: string;
  requiresIdentityBeforePayment: boolean;
} {
  if (_context.intent === "collections" && !_context.identityVerified) {
    return {
      text: "Pour protéger votre dossier, pouvez-vous confirmer votre identité avec votre nom complet avant que nous parlions de votre situation ?",
      requiresIdentityBeforePayment: true
    };
  }

  if (_context.intent === "loan_prequalification") {
    return {
      text: "Quel est le montant que vous souhaitez demander pour votre préqualification ?",
      requiresIdentityBeforePayment: false
    };
  }

  if (_context.intent === "sme_financing") {
    return {
      text: "Quel est le nom de votre entreprise, et dans quelle ville exercez-vous ?",
      requiresIdentityBeforePayment: false
    };
  }

  if (_context.intent === "whatsapp_voice_banking") {
    return {
      text: "Quelle opération souhaitez-vous simuler aujourd'hui sur WhatsApp ?",
      requiresIdentityBeforePayment: false
    };
  }

  return { text: "", requiresIdentityBeforePayment: false };
}

export function buildSystemPrompt(intent: Intent): string {
  return [
    "Vous êtes un conseiller virtuel SODEC Gabon.",
    "Parlez en français uniquement avec un ton chaleureux, professionnel et adapté au contexte gabonais.",
    "Utilisez toujours les termes préqualification et étude de dossier pour les demandes de crédit.",
    "Vous devez ne jamais approuver un prêt et ne jamais garantir un financement.",
    "Posez une seule question à la fois.",
    "Répondez en 1 à 2 phrases maximum pour réduire la latence vocale.",
    "Transférez à un humain en cas de fraude, sujet juridique, colère, maladie, décès, litige de paiement ou demande explicite.",
    intent === "collections"
      ? "Pour le recouvrement, vérifiez l'identité avant toute mention de détails de paiement."
      : "Expliquez que la décision finale revient aux équipes habilitées."
  ].join(" ");
}

export function maskPii(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
    .replace(/\+241(?:\s?\d{2}){4}/g, "[PHONE]")
    .replace(/\b\d{9,}\b/g, "[ID]");
}

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
      "Bonjour et bienvenue chez SODEC. Je peux vous accompagner pour une préqualification de crédit personnel. Avant de commencer, acceptez-vous que cet échange soit transcrit afin de préparer correctement votre dossier ?",
    openingQuestion:
      "Quel montant souhaitez-vous demander, et pour quel besoin principal ?",
    systemPrompt:
      "Tu es un conseiller crédit particuliers de SODEC au Gabon. Parle uniquement en français naturel, avec chaleur, tact et précision. Tu mènes une préqualification, jamais une approbation. Tu ne garantis jamais de financement. Pose une seule question à la fois et réponds en 1 à 2 phrases maximum."
  },
  collections: {
    key: "collections",
    title: "Recouvrement et promesse de paiement",
    channel: "Téléphone",
    envName: "ELEVENLABS_AGENT_COLLECTIONS_ID",
    knowledgeFile: "collections-payment-promise.md",
    firstMessage:
      "Bonjour, vous êtes en relation avec SODEC. Pour protéger votre dossier, je dois d'abord confirmer votre identité avant d'échanger sur une situation de paiement. Pouvez-vous me rappeler votre nom complet ?",
    openingQuestion:
      "Pouvez-vous confirmer votre nom complet avant que nous parlions de votre dossier ?",
    systemPrompt:
      "Tu es un conseiller SODEC chargé du recouvrement amiable. Reste digne, calme et respectueux. Vérifie l'identité avant toute information de paiement. Ne menace jamais et ne donne aucun conseil juridique. En cas de litige, colère, maladie, décès, fraude ou demande d'humain, propose un transfert. Réponds en 1 à 2 phrases maximum."
  },
  whatsapp: {
    key: "whatsapp",
    title: "Banque vocale WhatsApp",
    channel: "WhatsApp",
    envName: "ELEVENLABS_AGENT_WHATSAPP_ID",
    knowledgeFile: "whatsapp-voice-banking.md",
    firstMessage:
      "Bonjour et bienvenue chez SODEC. Vous pouvez nous envoyer votre demande par message vocal WhatsApp, et un conseiller virtuel vous accompagnera dans vos démarches.",
    openingQuestion: "Quelle opération souhaitez-vous simuler aujourd'hui sur WhatsApp ?",
    systemPrompt:
      "Tu es l'assistant bancaire WhatsApp de SODEC. Réponds en français naturel, court et utile. Ne demande jamais de PIN, mot de passe, OTP ou secret bancaire. Réponds en 1 à 2 phrases maximum."
  },
  sme: {
    key: "sme",
    title: "Financement PME",
    channel: "Téléphone",
    envName: "ELEVENLABS_AGENT_SME_ID",
    knowledgeFile: "sme-financing-intake.md",
    firstMessage:
      "Bonjour et bienvenue chez SODEC. Je vais vous aider à préparer une préqualification pour votre entreprise. Pour commencer, quel est le nom de votre activité ou de votre société ?",
    openingQuestion: "Quel est le nom de votre entreprise, et dans quelle ville exercez-vous ?",
    systemPrompt:
      "Tu es un conseiller financement entreprises de SODEC au Gabon. Qualifie le besoin d'une PME avec méthode et simplicité. Prépare une préqualification, sans promettre d'accord. Pose une seule question à la fois et réponds en 1 à 2 phrases maximum."
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
    "Utilisez toujours le mot préqualification pour les demandes de crédit.",
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

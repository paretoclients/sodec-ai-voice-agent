import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  detectIntent,
  getNextQuestion,
  maskPii,
  mustEscalate,
  type ConversationContext
} from "../packages/shared/src/index.js";

describe("intent routing", () => {
  it("routes individual prequalification requests without approving loans", () => {
    const result = detectIntent("Bonjour, je veux savoir si je peux avoir un crédit personnel");

    expect(result.intent).toBe("loan_prequalification");
    expect(result.language).toBe("fr");
    expect(result.disallowedTerms).not.toContain("approbation");
  });

  it("routes collections calls when a client mentions late payment", () => {
    const result = detectIntent("J'ai reçu un rappel pour mon échéance en retard");

    expect(result.intent).toBe("collections");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("routes SME financing intake for business financing language", () => {
    const result = detectIntent("Notre PME à Libreville cherche un financement pour stock");

    expect(result.intent).toBe("sme_financing");
  });
});

describe("escalation policy", () => {
  it("escalates fraud, legal, anger, illness, death, disputes, and human requests", () => {
    const triggers = [
      "fraude sur mon compte",
      "je vais appeler mon avocat",
      "je suis furieux contre vous",
      "je suis malade à l'hôpital",
      "la personne est décédée",
      "je conteste ce paiement",
      "passez-moi un conseiller"
    ];

    expect(triggers.map((text) => mustEscalate(text).escalate)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true
    ]);
  });
});

describe("conversation state machines", () => {
  it("requires identity verification before collections payment details", () => {
    const context: ConversationContext = {
      intent: "collections",
      transcriptConsent: true,
      identityVerified: false,
      collectedFields: {}
    };

    const question = getNextQuestion(context);

    expect(question.requiresIdentityBeforePayment).toBe(true);
    expect(question.text).toContain("confirmer votre identité");
    expect(question.text).not.toContain("montant");
    expect(question.text).not.toContain("échéance");
  });

  it("asks exactly one French question for loan prequalification", () => {
    const question = getNextQuestion({
      intent: "loan_prequalification",
      transcriptConsent: true,
      identityVerified: false,
      collectedFields: {}
    });

    expect(question.text).toBe("Quel est le montant que vous souhaitez demander pour votre préqualification ?");
    expect(question.text.match(/\?/g)).toHaveLength(1);
  });
});

describe("prompt safety", () => {
  it("requires French, prequalification language, and no financing guarantees", () => {
    const prompt = buildSystemPrompt("loan_prequalification");

    expect(prompt).toContain("français uniquement");
    expect(prompt).toContain("préqualification");
    expect(prompt).toContain("ne jamais approuver");
    expect(prompt).toContain("ne jamais garantir");
    expect(prompt).not.toContain("approbation");
  });
});

describe("PII masking", () => {
  it("masks phone numbers, national IDs, and email addresses", () => {
    const masked = maskPii("Client +241 77 12 34 56, NIP 123456789, mail jean@example.com");

    expect(masked).toBe("Client [PHONE], NIP [ID], mail [EMAIL]");
  });
});


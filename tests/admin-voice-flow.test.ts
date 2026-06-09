import { beforeEach, describe, expect, it, vi } from "vitest";

const createTranscriptDoc = vi.fn();
const appendTranscriptRow = vi.fn();
const createCalendarAppointment = vi.fn();

vi.mock("../apps/admin/src/lib/google-workspace.js", () => ({
  appendTranscriptRow,
  createCalendarAppointment,
  createTranscriptDoc
}));

describe("voice-first admin flow", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.OPENAI_CHAT_MODEL = "gpt-5.5";
  });

  it("returns a structured advisor reply for the voice loop", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content:
                    '{"content":"Bonjour, merci pour votre réponse. Quel est votre revenu mensuel approximatif ?","phase":"qualification","progress":34,"fields":{"nom complet":"Marie Kouassi"},"summary":"Préqualification en cours.","nextAction":"Demander le revenu mensuel","readyToFinalize":false,"escalationReason":null}'
                }
              }
            ]
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const { POST } = await import("../apps/admin/src/app/api/demo-chat/route.js");
    const response = await POST(
      new Request("http://localhost/api/demo-chat", {
        method: "POST",
        body: JSON.stringify({
          agent: "loan",
          messages: [{ role: "user", content: "Je veux parler d'un crédit personnel." }],
          fields: {}
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      content: "Bonjour, merci pour votre réponse. Quel est votre revenu mensuel approximatif ?",
      phase: "qualification",
      progress: 34,
      readyToFinalize: false,
      model: "gpt-5.5"
    });
  });

  it("saves transcripts to Google Docs and Sheets", async () => {
    createTranscriptDoc.mockResolvedValue({
      documentId: "doc-123",
      url: "https://docs.google.com/document/d/doc-123"
    });
    appendTranscriptRow.mockResolvedValue({
      spreadsheetId: "sheet-123",
      created: false,
      updatedRange: "Transcripts!A2:H2"
    });

    const { POST } = await import("../apps/admin/src/app/api/transcripts/route.js");
    const response = await POST(
      new Request("http://localhost/api/transcripts", {
        method: "POST",
        body: JSON.stringify({
          title: "SODEC - Préqualification particulier",
          agent: "Préqualification particulier",
          transcript: "Client: Bonjour\nConseiller: Bonjour",
          appointment: {
            name: "Marie Kouassi",
            phone: "+24177000000",
            reason: "Préqualification",
            preferredDate: new Date().toISOString()
          }
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "transcript_saved",
      documentId: "doc-123",
      documentUrl: "https://docs.google.com/document/d/doc-123",
      spreadsheetId: "sheet-123",
      updatedRange: "Transcripts!A2:H2"
    });
    expect(createTranscriptDoc).toHaveBeenCalledTimes(1);
    expect(appendTranscriptRow).toHaveBeenCalledTimes(1);
  });

  it("creates calendar appointments when available", async () => {
    createCalendarAppointment.mockResolvedValue({
      eventId: "event-123",
      url: "https://calendar.google.com/event?eid=event-123"
    });

    const { POST } = await import("../apps/admin/src/app/api/appointments/route.js");
    const response = await POST(
      new Request("http://localhost/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          name: "Marie Kouassi",
          phone: "+24177000000",
          reason: "Préqualification particulier",
          preferredDate: new Date().toISOString()
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "calendar_event_created",
      eventId: "event-123",
      url: "https://calendar.google.com/event?eid=event-123"
    });
    expect(createCalendarAppointment).toHaveBeenCalledTimes(1);
  });
});

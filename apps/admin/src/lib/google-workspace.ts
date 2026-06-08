import { google } from "googleapis";

export type WorkspaceAppointment = {
  name: string;
  phone: string;
  reason: string;
  preferredDate: string;
};

export type WorkspaceTranscript = {
  title: string;
  agent: string;
  transcript: string;
  appointment?: WorkspaceAppointment;
};

type WorkspaceConfig = {
  calendarId: string;
  docId?: string;
  folderId: string;
  sheetId?: string;
  serviceAccountEmail: string;
  privateKey: string;
};

function loadConfig(): WorkspaceConfig {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!calendarId || !folderId || !serviceAccountEmail || !privateKey) {
    throw new Error(
      "Google Workspace requires GOOGLE_CALENDAR_ID, GOOGLE_DRIVE_FOLDER_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
    );
  }

  return {
    calendarId,
    docId: process.env.GOOGLE_DOC_ID,
    folderId,
    sheetId: process.env.GOOGLE_SHEET_ID ?? process.env.GOOGLE_SHEETS_TRANSCRIPTS_ID,
    serviceAccountEmail,
    privateKey
  };
}

function auth(config: WorkspaceConfig) {
  return new google.auth.JWT({
    email: config.serviceAccountEmail,
    key: config.privateKey,
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets"
    ]
  });
}

export async function verifyDriveFolderAccess(): Promise<{ folderId: string; folderName: string }> {
  const config = loadConfig();
  const drive = google.drive({ version: "v3", auth: auth(config) });
  const folder = await drive.files.get({
    fileId: config.folderId,
    fields: "id,name,mimeType"
  });

  if (folder.data.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID does not point to a Drive folder.");
  }

  return { folderId: config.folderId, folderName: folder.data.name ?? "SODEC transcripts" };
}

export async function createTranscriptDoc(input: WorkspaceTranscript): Promise<{ documentId: string; url: string }> {
  const config = loadConfig();
  const client = auth(config);
  const docs = google.docs({ version: "v1", auth: client });
  const drive = google.drive({ version: "v3", auth: client });

  let documentId = config.docId;
  if (!documentId) {
    const created = await drive.files.create({
      requestBody: {
        name: input.title,
        mimeType: "application/vnd.google-apps.document",
        parents: [config.folderId]
      }
    });
    documentId = created.data.id ?? undefined;
    if (!documentId) {
      throw new Error("Google Drive did not return a document id.");
    }
  }

  const existing = await docs.documents.get({ documentId });
  const endIndex =
    existing.data.body?.content?.at(-1)?.endIndex && existing.data.body.content.at(-1)?.endIndex !== 1
      ? (existing.data.body.content.at(-1)?.endIndex ?? 2) - 1
      : 1;

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: endIndex },
            text: [
              "\n\n",
              `${input.title}\n\n`,
              `Agent: ${input.agent}\n`,
              `Created: ${new Date().toISOString()}\n\n`,
              input.transcript,
              "\n"
            ].join("")
          }
        }
      ]
    }
  });

  return {
    documentId,
    url: `https://docs.google.com/document/d/${documentId}/edit`
  };
}

export async function ensureTranscriptSheet(): Promise<{ spreadsheetId: string; created: boolean }> {
  const config = loadConfig();
  if (config.sheetId) {
    const client = auth(config);
    const sheets = google.sheets({ version: "v4", auth: client });
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: config.sheetId,
      fields: "sheets.properties.title"
    });
    const hasTranscriptTab = spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === "Transcripts");
    if (!hasTranscriptTab) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: config.sheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: "Transcripts" } } }]
        }
      });
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.sheetId,
      range: "Transcripts!A1:G1",
      valueInputOption: "RAW",
      requestBody: {
        values: [["Created", "Agent", "Name", "Phone", "Reason", "Document URL", "Transcript"]]
      }
    });
    return { spreadsheetId: config.sheetId, created: false };
  }

  const client = auth(config);
  const sheets = google.sheets({ version: "v4", auth: client });
  const drive = google.drive({ version: "v3", auth: client });
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "SODEC AI Voice Agent Transcripts" },
      sheets: [{ properties: { title: "Transcripts" } }]
    }
  });
  const spreadsheetId = created.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error("Google Sheets did not return a spreadsheet id.");
  }

  await drive.files.update({
    fileId: spreadsheetId,
    addParents: config.folderId,
    fields: "id,parents"
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Transcripts!A1:G1",
    valueInputOption: "RAW",
    requestBody: {
      values: [["Created", "Agent", "Name", "Phone", "Reason", "Document URL", "Transcript"]]
    }
  });

  return { spreadsheetId, created: true };
}

export async function appendTranscriptRow(
  input: WorkspaceTranscript,
  documentUrl: string
): Promise<{ spreadsheetId: string; updatedRange?: string; created: boolean }> {
  const config = loadConfig();
  const client = auth(config);
  const sheets = google.sheets({ version: "v4", auth: client });
  const sheet = await ensureTranscriptSheet();

  const appended = await sheets.spreadsheets.values.append({
    spreadsheetId: sheet.spreadsheetId,
    range: "Transcripts!A:G",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          new Date().toISOString(),
          input.agent,
          input.appointment?.name ?? "",
          input.appointment?.phone ?? "",
          input.appointment?.reason ?? "",
          documentUrl,
          input.transcript
        ]
      ]
    }
  });

  return {
    spreadsheetId: sheet.spreadsheetId,
    updatedRange: appended.data.updates?.updatedRange ?? undefined,
    created: sheet.created
  };
}

export async function createCalendarAppointment(
  appointment: WorkspaceAppointment
): Promise<{ eventId: string; url?: string }> {
  const config = loadConfig();
  const calendar = google.calendar({ version: "v3", auth: auth(config) });
  const start = new Date(appointment.preferredDate);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const created = await calendar.events.insert({
    calendarId: config.calendarId,
    requestBody: {
      summary: `SODEC - ${appointment.name}`,
      description: `Téléphone: ${appointment.phone}\nMotif: ${appointment.reason}`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() }
    }
  });

  if (!created.data.id) {
    throw new Error("Google Calendar did not return an event id.");
  }

  return {
    eventId: created.data.id,
    url: created.data.htmlLink ?? undefined
  };
}

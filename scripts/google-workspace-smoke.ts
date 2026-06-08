import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import {
  appendTranscriptRow,
  createCalendarAppointment,
  createTranscriptDoc,
  ensureTranscriptSheet,
  verifyDriveFolderAccess
} from "../apps/admin/src/lib/google-workspace.js";

function loadEnv(): void {
  const content = readFileSync(".env", "utf8");
  for (const line of content.split("\n")) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }
    const index = line.indexOf("=");
    if (index > -1 && !process.env[line.slice(0, index)]) {
      process.env[line.slice(0, index)] = line.slice(index + 1);
    }
  }
}

async function writeSheetIdIfMissing(spreadsheetId: string): Promise<void> {
  const env = await readFile(".env", "utf8");
  if (/^GOOGLE_SHEET_ID=.+/m.test(env)) {
    return;
  }
  const next = env.includes("GOOGLE_SHEET_ID=")
    ? env.replace(/^GOOGLE_SHEET_ID=.*$/m, `GOOGLE_SHEET_ID=${spreadsheetId}`)
    : `${env.replace(/\n*$/, "\n")}GOOGLE_SHEET_ID=${spreadsheetId}\n`;
  await writeFile(".env", next);
}

loadEnv();

const now = new Date();
const appointmentStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const transcript = {
  title: `SODEC smoke transcript ${now.toISOString()}`,
  agent: "Préqualification particulier",
  transcript:
    "Agent: Bonjour, vous êtes avec SODEC Gabon.\nClient: Je souhaite une préqualification.\nAgent: Quel est l'objet de votre demande ?",
  appointment: {
    name: "Client Smoke Test",
    phone: "+241 ** ** 00 00",
    reason: "Smoke test SODEC AI voice agent",
    preferredDate: appointmentStart.toISOString()
  }
};

const folder = await verifyDriveFolderAccess();
console.log(`drive_folder_access=ok name=${folder.folderName}`);

const doc = await createTranscriptDoc(transcript);
console.log(`google_doc_created=ok id=${doc.documentId}`);

const sheet = await ensureTranscriptSheet();
await writeSheetIdIfMissing(sheet.spreadsheetId);
const appended = await appendTranscriptRow(transcript, doc.url);
console.log(`sheets_append=ok spreadsheet=${appended.spreadsheetId} range=${appended.updatedRange ?? "unknown"}`);

const event = await createCalendarAppointment(transcript.appointment);
console.log(`calendar_event_created=ok id=${event.eventId}`);

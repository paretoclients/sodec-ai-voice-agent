import { NextResponse } from "next/server";
import {
  appendTranscriptRow,
  createTranscriptDoc,
  type WorkspaceTranscript
} from "../../../lib/google-workspace";

export async function POST(request: Request) {
  const body = (await request.json()) as WorkspaceTranscript;

  try {
    const doc = await createTranscriptDoc(body);
    const sheet = await appendTranscriptRow(body, doc.url);
    return NextResponse.json({
      status: "transcript_saved",
      documentId: doc.documentId,
      documentUrl: doc.url,
      spreadsheetId: sheet.spreadsheetId,
      spreadsheetCreated: sheet.created,
      updatedRange: sheet.updatedRange
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "transcript_save_failed",
        error: error instanceof Error ? error.message : "Unknown Google Workspace error"
      },
      { status: 500 }
    );
  }
}

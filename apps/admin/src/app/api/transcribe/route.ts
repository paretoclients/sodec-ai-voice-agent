import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }

  const payload = new FormData();
  payload.append("file", file, "voice.webm");
  payload.append("model", "gpt-4o-transcribe");
  payload.append("language", "fr");
  payload.append("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`
    },
    body: payload
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `OpenAI transcription failed with ${response.status}` },
      { status: 502 }
    );
  }

  const data = (await response.json()) as { text?: string };
  return NextResponse.json({
    text: data.text ?? ""
  });
}

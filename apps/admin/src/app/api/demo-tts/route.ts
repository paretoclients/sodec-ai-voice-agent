import { NextResponse } from "next/server";

type TtsRequest = {
  text: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    return NextResponse.json({ error: "ElevenLabs voice is not configured" }, { status: 500 });
  }

  const body = (await request.json()) as TtsRequest;
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "xi-api-key": apiKey
    },
    body: JSON.stringify({
      text: body.text.slice(0, 1200),
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.75
      }
    })
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `ElevenLabs TTS failed with ${response.status}` },
      { status: 502 }
    );
  }

  return new Response(await response.arrayBuffer(), {
    headers: {
      "content-type": "audio/mpeg"
    }
  });
}


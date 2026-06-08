import { NextResponse } from "next/server";
import { sodecAgents, type SodecAgentKey } from "../../../lib/sodec-agents";

type TtsRequest = {
  agent?: SodecAgentKey;
  text: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const body = (await request.json()) as TtsRequest;
  const agentVoiceId =
    body.agent && body.agent in sodecAgents ? process.env[sodecAgents[body.agent].envName] : undefined;
  const voiceId = agentVoiceId ?? process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    return NextResponse.json({ error: "ElevenLabs voice is not configured" }, { status: 500 });
  }

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
        stability: 0.62,
        similarity_boost: 0.82,
        style: 0.22,
        use_speaker_boost: true
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

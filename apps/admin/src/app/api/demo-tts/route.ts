import { NextResponse } from "next/server";
import { sodecAgents, type SodecAgentKey } from "../../../lib/sodec-agents";

type TtsRequest = {
  agent?: SodecAgentKey;
  text: string;
};

const DEMO_VOICE_ID = "NZ8KtusXpnktPYja5Qko";

function normalizePronunciation(text: string): string {
  return text
    .replace(/\bFCFA\b/g, "francs CFA")
    .replace(/\bPME\b/g, "petites et moyennes entreprises")
    .replace(/\bTPE\b/g, "très petites entreprises")
    .replace(/\bRCCM\b/g, "R C C M")
    .replace(/\bNIF\b/g, "N I F")
    .replace(/\bSODEC\b/g, "SODEC")
    .replace(/\bGabon\b/g, "Gabon")
    .replace(/\bLibreville\b/g, "Libreville")
    .replace(/\bPort-Gentil\b/g, "Port-Gentil")
    .replace(/\bFranceville\b/g, "Franceville");
}

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const body = (await request.json()) as TtsRequest;
  const voiceProfile = body.agent && body.agent in sodecAgents ? sodecAgents[body.agent].voiceSettings : undefined;

  if (!apiKey) {
    return NextResponse.json({ error: "ElevenLabs voice is not configured" }, { status: 500 });
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${DEMO_VOICE_ID}/stream?output_format=pcm_16000`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "xi-api-key": apiKey
    },
    body: JSON.stringify({
      text: normalizePronunciation(body.text).slice(0, 1200),
      model_id: "eleven_flash_v2_5",
      output_format: "pcm_16000",
      voice_settings: {
        stability: voiceProfile?.stability ?? 0.7,
        similarity_boost: voiceProfile?.similarity_boost ?? 0.85,
        style: voiceProfile?.style ?? 0.15,
        speed: voiceProfile?.speed ?? 0.95,
        use_speaker_boost: true
      },
      enable_logging: false
    })
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `ElevenLabs TTS failed with ${response.status}` },
      { status: 502 }
    );
  }

  return new Response(response.body, {
    headers: {
      "content-type": "audio/pcm"
    }
  });
}

import type { AppConfig } from "./config.js";

export async function synthesizeFrenchSpeech(
  text: string,
  config: AppConfig
): Promise<Uint8Array | null> {
  if (!config.ELEVENLABS_API_KEY || !config.ELEVENLABS_VOICE_ID) {
    return null;
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${config.ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": config.ELEVENLABS_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.55, similarity_boost: 0.75 }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed with ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}


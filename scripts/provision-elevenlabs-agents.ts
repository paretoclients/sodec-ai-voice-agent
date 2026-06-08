import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sodecAgents, type SodecAgentProfile } from "../packages/shared/src/index.js";

type EnvMap = Record<string, string>;

type KnowledgeDocument = {
  id: string;
  name: string;
};

function parseEnv(content: string): EnvMap {
  const env: EnvMap = {};
  for (const line of content.split("\n")) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }
    const index = line.indexOf("=");
    if (index > -1) {
      env[line.slice(0, index)] = line.slice(index + 1);
    }
  }
  return env;
}

function serializeEnv(original: string, updates: EnvMap): string {
  const seen = new Set<string>();
  const lines = original.split("\n").map((line) => {
    const index = line.indexOf("=");
    if (index === -1 || line.trim().startsWith("#")) {
      return line;
    }
    const key = line.slice(0, index);
    if (key in updates) {
      seen.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      lines.push(`${key}=${value}`);
    }
  }

  return lines.join("\n").replace(/\n*$/, "\n");
}

async function resolveVoiceId(apiKey: string, currentVoiceId: string | undefined): Promise<string> {
  if (currentVoiceId) {
    return currentVoiceId;
  }

  const response = await fetch("https://api.elevenlabs.io/v2/voices?page_size=20", {
    headers: { "xi-api-key": apiKey }
  });

  if (!response.ok) {
    throw new Error(`Voice lookup failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    voices?: Array<{ voice_id: string; name: string; labels?: Record<string, string> }>;
  };
  const voices = payload.voices ?? [];
  const preferred =
    voices.find((voice) => /french|français|multilingual/i.test(JSON.stringify(voice.labels ?? {}))) ??
    voices[0];

  if (!preferred) {
    throw new Error("No ElevenLabs voices are available on this account.");
  }

  return preferred.voice_id;
}

async function createKnowledgeDocument(
  apiKey: string,
  spec: SodecAgentProfile
): Promise<KnowledgeDocument> {
  const content = await readFile(path.join("knowledge-base", spec.knowledgeFile), "utf8");
  const response = await fetch("https://api.elevenlabs.io/v1/convai/knowledge-base/text", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "xi-api-key": apiKey
    },
    body: JSON.stringify({
      name: `KB - ${spec.title}`,
      text: content
    })
  });

  if (!response.ok) {
    throw new Error(`Knowledge base creation failed for ${spec.title}: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as Partial<KnowledgeDocument> & {
    document_id?: string;
  };
  const id = payload.id ?? payload.document_id;
  if (!id) {
    throw new Error(`Knowledge base response did not include an id for ${spec.title}.`);
  }

  return { id, name: payload.name ?? `KB - ${spec.title}` };
}

async function createAgent(
  apiKey: string,
  voiceId: string,
  spec: SodecAgentProfile,
  document: KnowledgeDocument
): Promise<string> {
  const response = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "xi-api-key": apiKey
    },
    body: JSON.stringify({
      name: `SODEC Gabon - ${spec.title}`,
      tags: ["sodec", "gabon", "demo", spec.key],
      conversation_config: {
        agent: {
          first_message: spec.firstMessage,
          language: "fr",
          prompt: {
            prompt: spec.systemPrompt,
            llm: "gemini-2.0-flash",
            temperature: 0.4,
            knowledge_base: [
              {
                type: "text",
                name: document.name,
                id: document.id
              }
            ]
          }
        },
        tts: {
          model_id: "eleven_turbo_v2_5",
          voice_id: voiceId
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Agent creation failed for ${spec.title}: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { agent_id?: string };
  if (!payload.agent_id) {
    throw new Error(`Agent creation response did not include agent_id for ${spec.title}.`);
  }
  return payload.agent_id;
}

async function main(): Promise<void> {
  const envPath = ".env";
  const envContent = await readFile(envPath, "utf8");
  const env = parseEnv(envContent);
  const apiKey = env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error("Set ELEVENLABS_API_KEY in .env before provisioning.");
  }

  const voiceId = await resolveVoiceId(apiKey, env.ELEVENLABS_VOICE_ID);
  const updates: EnvMap = { ELEVENLABS_VOICE_ID: voiceId };

  for (const spec of Object.values(sodecAgents)) {
    if (env[spec.envName]) {
      updates[spec.envName] = env[spec.envName];
      continue;
    }
    const document = await createKnowledgeDocument(apiKey, spec);
    updates[spec.envName] = await createAgent(apiKey, voiceId, spec, document);
  }

  await writeFile(envPath, serializeEnv(envContent, updates));
  console.log("ElevenLabs voice and agent IDs were written to .env.");
}

await main();

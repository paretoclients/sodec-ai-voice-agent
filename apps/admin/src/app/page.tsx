"use client";

import { useMemo, useState } from "react";
import {
  createEmptyFields,
  sodecAgents,
  type FlowPhase,
  type SodecAgentKey
} from "../lib/sodec-agents";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AdvisorPayload = {
  content?: string;
  phase?: FlowPhase;
  progress?: number;
  fields?: Record<string, string>;
  summary?: string;
  nextAction?: string;
  readyToFinalize?: boolean;
  escalationReason?: string | null;
  model?: string;
  error?: string;
};

type FinalizeStatus = {
  label: string;
  detail: string;
  ok: boolean;
};

const agentKeys = Object.keys(sodecAgents) as SodecAgentKey[];

function createAmbience(audio: HTMLAudioElement) {
  const AudioContextClass = window.AudioContext;
  const context = new AudioContextClass();
  const source = context.createMediaElementSource(audio);
  const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * 0.015;
  }

  const noise = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const voiceGain = context.createGain();
  const ambienceGain = context.createGain();

  noise.buffer = noiseBuffer;
  noise.loop = true;
  filter.type = "bandpass";
  filter.frequency.value = 420;
  filter.Q.value = 0.55;
  voiceGain.gain.value = 1;
  ambienceGain.gain.value = 0.018;

  source.connect(voiceGain).connect(context.destination);
  noise.connect(filter).connect(ambienceGain).connect(context.destination);
  noise.start();

  return {
    context,
    stop: () => {
      noise.stop();
      void context.close();
    }
  };
}

export default function DashboardPage() {
  const [agentKey, setAgentKey] = useState<SodecAgentKey>("loan");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: sodecAgents.loan.firstMessage }
  ]);
  const [fields, setFields] = useState<Record<string, string>>(createEmptyFields(sodecAgents.loan));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceState, setVoiceState] = useState("Voix prête");
  const [phase, setPhase] = useState<FlowPhase>("accueil");
  const [progress, setProgress] = useState(8);
  const [summary, setSummary] = useState("Le dossier se construit au fil de l'échange.");
  const [nextAction, setNextAction] = useState("Démarrer l'entretien");
  const [readyToFinalize, setReadyToFinalize] = useState(false);
  const [finalizeStatuses, setFinalizeStatuses] = useState<FinalizeStatus[]>([]);
  const [model, setModel] = useState("gpt-5.5");
  const agent = sodecAgents[agentKey];

  const transcript = useMemo(
    () => messages.map((message) => `${message.role === "user" ? "Client" : "Conseiller"}: ${message.content}`).join("\n"),
    [messages]
  );

  function switchAgent(nextAgent: SodecAgentKey) {
    const nextProfile = sodecAgents[nextAgent];
    setAgentKey(nextAgent);
    setMessages([{ role: "assistant", content: nextProfile.firstMessage }]);
    setFields(createEmptyFields(nextProfile));
    setInput("");
    setPhase("accueil");
    setProgress(8);
    setSummary("Le dossier se construit au fil de l'échange.");
    setNextAction("Démarrer l'entretien");
    setReadyToFinalize(false);
    setFinalizeStatuses([]);
    setVoiceState("Voix prête");
  }

  function useSampleLine() {
    setInput(agent.sampleCustomerLine);
  }

  async function sendMessage() {
    const content = input.trim();
    if (!content || busy) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    setNextAction("Le conseiller analyse la réponse...");

    try {
      const response = await fetch("/api/demo-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agent: agentKey, messages: nextMessages, fields })
      });
      const payload = (await response.json()) as AdvisorPayload;
      const advisorContent =
        payload.content ??
        payload.error ??
        "Je n'ai pas pu traiter cette réponse correctement. Je peux préparer un transfert vers un conseiller SODEC.";

      setMessages([...nextMessages, { role: "assistant", content: advisorContent }]);
      setFields(payload.fields ?? fields);
      setPhase(payload.phase ?? "qualification");
      setProgress(payload.progress ?? progress);
      setSummary(payload.summary ?? summary);
      setNextAction(payload.nextAction ?? "Poursuivre l'entretien");
      setReadyToFinalize(Boolean(payload.readyToFinalize));
      setModel(payload.model ?? model);
    } finally {
      setBusy(false);
    }
  }

  async function playLastAgentMessage() {
    const last = [...messages].reverse().find((message) => message.role === "assistant");
    if (!last) {
      return;
    }

    setVoiceState("Préparation de la voix...");
    const response = await fetch("/api/demo-tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agent: agentKey, text: last.content })
    });

    if (!response.ok) {
      setVoiceState("Voix indisponible");
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "La voix ElevenLabs n'est pas disponible pour le moment." }
      ]);
      return;
    }

    const audio = new Audio(URL.createObjectURL(await response.blob()));
    setVoiceState("Lecture avec ambiance de bureau très légère");
    const ambience = createAmbience(audio);
    audio.addEventListener("ended", () => {
      ambience.stop();
      setVoiceState("Voix prête");
    });
    await audio.play();
  }

  async function finalizeConversation() {
    setFinalizeStatuses([{ label: "Préparation", detail: "Création de la synthèse opérationnelle...", ok: true }]);
    const preferredDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const appointment = {
      name: fields["nom complet"] || fields["nom et ville"] || "Client SODEC",
      phone: "+241 00 00 00 00",
      reason: `${agent.title}: ${summary}`,
      preferredDate
    };

    const transcriptResponse = await fetch("/api/transcripts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: `SODEC - ${agent.title} - ${new Date().toLocaleDateString("fr-FR")}`,
        agent: agent.title,
        transcript,
        appointment
      })
    });
    const transcriptPayload = (await transcriptResponse.json()) as {
      status: string;
      documentUrl?: string;
      updatedRange?: string;
      error?: string;
    };

    setFinalizeStatuses((current) => [
      ...current,
      {
        label: "Google Workspace",
        detail:
          transcriptPayload.status === "transcript_saved"
            ? `Document créé et ligne Sheets ajoutée${transcriptPayload.documentUrl ? `: ${transcriptPayload.documentUrl}` : "."}`
            : `Échec Workspace: ${transcriptPayload.error ?? transcriptPayload.status}`,
        ok: transcriptPayload.status === "transcript_saved"
      }
    ]);

    const appointmentResponse = await fetch("/api/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(appointment)
    });
    const appointmentPayload = (await appointmentResponse.json()) as { status: string; url?: string; error?: string };
    setFinalizeStatuses((current) => [
      ...current,
      {
        label: agentKey === "collections" ? "Tâche de suivi" : "Rendez-vous",
        detail:
          appointmentPayload.status === "calendar_event_created"
            ? `Événement Calendar créé${appointmentPayload.url ? `: ${appointmentPayload.url}` : "."}`
            : `Calendar indisponible: ${appointmentPayload.error ?? appointmentPayload.status}`,
        ok: appointmentPayload.status === "calendar_event_created"
      }
    ]);
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">SODEC Gabon</p>
          <h1>Employé numérique pour relation client bancaire</h1>
          <p className="topline">
            Conversations vocales en français, synthèses opérationnelles et suivi Google Workspace.
          </p>
        </div>
        <div className="status-cluster">
          <span>Modèle: {model}</span>
          <strong>Démo exécutive</strong>
        </div>
      </header>

      <section className="agent-tabs" aria-label="Agents SODEC">
        {agentKeys.map((key) => (
          <button className={key === agentKey ? "active" : ""} key={key} onClick={() => switchAgent(key)} type="button">
            <span>{sodecAgents[key].title}</span>
            <small>
              {sodecAgents[key].role} · {sodecAgents[key].channel}
            </small>
          </button>
        ))}
      </section>

      <section className="command-band">
        <div>
          <p className="eyebrow">Agent actif</p>
          <h2>{agent.role}</h2>
          <p>{agent.openingQuestion}</p>
        </div>
        <div className="progress-block">
          <span>{phase}</span>
          <div className="progress-track">
            <div style={{ width: `${progress}%` }} />
          </div>
          <strong>{progress}%</strong>
        </div>
      </section>

      <section className="demo-shell">
        <div className="conversation-panel">
          <div className="panel-header">
            <div>
              <h2>Entretien client</h2>
              <p>{nextAction}</p>
            </div>
            <div className="voice-actions">
              <button className="secondary" onClick={playLastAgentMessage} type="button">
                Lire la voix
              </button>
              <small>{voiceState}</small>
            </div>
          </div>

          <div className="messages" aria-live="polite">
            {messages.map((message, index) => (
              <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                <strong>{message.role === "user" ? "Client" : "Conseiller SODEC"}</strong>
                <p>{message.content}</p>
              </div>
            ))}
            {busy ? (
              <div className="message assistant loading">
                <strong>Conseiller SODEC</strong>
                <p>Analyse de la réponse et préparation de la prochaine question...</p>
              </div>
            ) : null}
          </div>

          <div className="composer">
            <button className="ghost" onClick={useSampleLine} type="button">
              Exemple
            </button>
            <input
              aria-label="Message client"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void sendMessage();
                }
              }}
              placeholder="Réponse du client en français"
              value={input}
            />
            <button disabled={busy} onClick={sendMessage} type="button">
              {busy ? "Analyse" : "Envoyer"}
            </button>
          </div>
        </div>

        <aside className="side-panel">
          <section>
            <h2>Progression du dossier</h2>
            <ol className="step-list">
              {agent.steps.map((step) => (
                <li className={fields[step.field] ? "done" : ""} key={step.field}>
                  <span>{step.label}</span>
                  <small>{fields[step.field] || step.field}</small>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2>Synthèse conseiller</h2>
            <p className="summary">{summary}</p>
            <button disabled={!readyToFinalize} onClick={finalizeConversation} type="button">
              Finaliser le dossier
            </button>
            <small className="hint">{readyToFinalize ? agent.successLabel : "Continuez l'entretien pour compléter le dossier."}</small>
          </section>

          {finalizeStatuses.length ? (
            <section>
              <h2>Intégrations</h2>
              <div className="status-list">
                {finalizeStatuses.map((status) => (
                  <p className={status.ok ? "ok" : "warn"} key={`${status.label}-${status.detail}`}>
                    <strong>{status.label}</strong>
                    <span>{status.detail}</span>
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2>Transcript</h2>
            <pre>{transcript}</pre>
          </section>
        </aside>
      </section>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

type SpeechRecognitionResult = {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResult[];
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: null | (() => void);
  onresult: null | ((event: SpeechRecognitionEvent) => void);
  onend: null | (() => void);
  onerror: null | ((event: { error: string }) => void);
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type VoiceState = "En attente" | "J’écoute" | "Analyse en cours" | "Réponse du conseiller" | "Finalisation" | "Terminé" | "Pause";

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    webkitAudioContext?: typeof AudioContext;
  }
}

const DEMO_ACCESS_CODE = "SODEC-2417";
const STORAGE_KEY = "sodec-admin-demo-unlocked";
const agentKeys = Object.keys(sodecAgents) as SodecAgentKey[];

function createOfficeAmbience(audio: HTMLAudioElement) {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("AudioContext unavailable");
  }

  const context = new AudioContextClass();
  const source = context.createMediaElementSource(audio);
  const voiceGain = context.createGain();
  const roomGain = context.createGain();
  const humGain = context.createGain();
  const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);

  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * 0.03;
  }

  const noise = context.createBufferSource();
  const lowPass = context.createBiquadFilter();
  const humA = context.createOscillator();
  const humB = context.createOscillator();

  noise.buffer = noiseBuffer;
  noise.loop = true;
  lowPass.type = "lowpass";
  lowPass.frequency.value = 360;
  lowPass.Q.value = 0.65;
  humA.type = "sine";
  humA.frequency.value = 98;
  humB.type = "sine";
  humB.frequency.value = 196;
  voiceGain.gain.value = 1;
  roomGain.gain.value = 0.012;
  humGain.gain.value = 0.0035;

  source.connect(voiceGain).connect(context.destination);
  noise.connect(lowPass).connect(roomGain).connect(context.destination);
  humA.connect(humGain).connect(context.destination);
  humB.connect(humGain).connect(context.destination);

  void context.resume();
  noise.start();
  humA.start();
  humB.start();

  return {
    stop: () => {
      noise.stop();
      humA.stop();
      humB.stop();
      void context.close();
    }
  };
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export default function DashboardPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [rememberAccess, setRememberAccess] = useState(true);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [agentKey, setAgentKey] = useState<SodecAgentKey>("loan");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [fields, setFields] = useState<Record<string, string>>(createEmptyFields(sodecAgents.loan));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("En attente");
  const [voiceDetail, setVoiceDetail] = useState("Cliquez sur Démarrer l’appel vocal.");
  const [phase, setPhase] = useState<FlowPhase>("accueil");
  const [progress, setProgress] = useState(8);
  const [summary, setSummary] = useState("Le dossier se construit au fil de l'échange.");
  const [nextAction, setNextAction] = useState("Démarrer l'entretien");
  const [readyToFinalize, setReadyToFinalize] = useState(false);
  const [finalizeStatuses, setFinalizeStatuses] = useState<FinalizeStatus[]>([]);
  const [model, setModel] = useState("gpt-5.5");
  const [callActive, setCallActive] = useState(false);
  const [callPaused, setCallPaused] = useState(false);
  const [callFinished, setCallFinished] = useState(false);
  const [textFallbackOpen, setTextFallbackOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambienceRef = useRef<{ stop: () => void } | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptBufferRef = useRef("");
  const autoFinalizeRef = useRef(false);
  const manualEndRef = useRef(false);
  const finalizedRef = useRef(false);

  const agent = sodecAgents[agentKey];

  useEffect(() => {
    const stored =
      window.localStorage.getItem(STORAGE_KEY) === DEMO_ACCESS_CODE ||
      window.sessionStorage.getItem(STORAGE_KEY) === DEMO_ACCESS_CODE;
    setUnlocked(stored);
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      ambienceRef.current?.stop();
      recognitionRef.current?.abort();
    };
  }, []);

  const transcript = useMemo(
    () => messages.map((message) => `${message.role === "user" ? "Client" : "Conseiller"}: ${message.content}`).join("\n"),
    [messages]
  );

  function unlockDashboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = accessCode.trim().toUpperCase();
    if (value !== DEMO_ACCESS_CODE) {
      setUnlockError("Code incorrect.");
      return;
    }

    if (rememberAccess) {
      window.localStorage.setItem(STORAGE_KEY, DEMO_ACCESS_CODE);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, DEMO_ACCESS_CODE);
    }

    setUnlockError(null);
    setUnlocked(true);
  }

  function stopRecognition() {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  }

  function stopAudioPlayback() {
    audioRef.current?.pause();
    audioRef.current = null;
    ambienceRef.current?.stop();
    ambienceRef.current = null;
  }

  function resetConversation(nextAgent: SodecAgentKey) {
    audioRef.current?.pause();
    ambienceRef.current?.stop();
    recognitionRef.current?.abort();

    setAgentKey(nextAgent);
    setMessages([]);
    setFields(createEmptyFields(sodecAgents[nextAgent]));
    setInput("");
    setBusy(false);
    setVoiceState("En attente");
    setVoiceDetail("Cliquez sur Démarrer l’appel vocal.");
    setPhase("accueil");
    setProgress(8);
    setSummary("Le dossier se construit au fil de l'échange.");
    setNextAction("Démarrer l'entretien");
    setReadyToFinalize(false);
    setFinalizeStatuses([]);
    setModel("gpt-5.5");
    setCallActive(false);
    setCallPaused(false);
    setCallFinished(false);
    setTextFallbackOpen(false);
    autoFinalizeRef.current = false;
    manualEndRef.current = false;
    finalizedRef.current = false;
  }

  async function playAgentSpeech(
    text: string,
    agentForVoice: SodecAgentKey = agentKey,
    onEnded?: () => Promise<void> | void
  ) {
    if (!text) {
      await onEnded?.();
      return;
    }

    setVoiceState("Réponse du conseiller");
    setVoiceDetail("Synthèse vocale en cours.");

    const response = await fetch("/api/demo-tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agent: agentForVoice, text })
    });

    if (!response.ok) {
      setVoiceDetail("La voix ElevenLabs est indisponible.");
      await onEnded?.();
      return;
    }

    stopAudioPlayback();
    const audio = new Audio(URL.createObjectURL(await response.blob()));
    audioRef.current = audio;
    audio.preload = "auto";
    audio.volume = 0.98;
    setVoiceDetail("Lecture avec ambiance de bureau.");

    audio.onended = async () => {
      stopAudioPlayback();
      URL.revokeObjectURL(audio.src);
      await onEnded?.();
    };

    audio.onerror = () => {
      stopAudioPlayback();
      setVoiceDetail("Lecture interrompue.");
      URL.revokeObjectURL(audio.src);
    };

    ambienceRef.current = createOfficeAmbience(audio);

    try {
      await audio.play();
    } catch {
      setVoiceDetail("Lecture bloquée par le navigateur.");
      await onEnded?.();
    }
  }

  function startListeningCapture() {
    if (!callActive || callPaused || callFinished) {
      return;
    }

    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setVoiceState("En attente");
      setVoiceDetail("La reconnaissance vocale n’est pas disponible dans ce navigateur.");
      return;
    }

    stopRecognition();
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    transcriptBufferRef.current = "";

    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setVoiceState("J’écoute");
      setVoiceDetail("J’attends la prochaine intervention du client.");
    };

    recognition.onresult = (event) => {
      let interimText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result) {
          continue;
        }

        const transcriptText = result[0]?.transcript?.trim() ?? "";
        if (!transcriptText) {
          continue;
        }

        if (result.isFinal) {
          transcriptBufferRef.current = transcriptText;
        } else {
          interimText = transcriptText;
        }
      }

      if (interimText) {
        setInput(interimText);
      }
    };

    recognition.onerror = (event) => {
      setVoiceState(callPaused ? "Pause" : "En attente");
      setVoiceDetail(event.error === "not-allowed" ? "Autorisation micro refusée." : "Écoute interrompue.");
    };

    recognition.onend = () => {
      const transcriptText = transcriptBufferRef.current.trim();
      transcriptBufferRef.current = "";

      if (transcriptText) {
        void sendConversation(transcriptText);
        return;
      }

      if (callActive && !callPaused && !callFinished) {
        setVoiceState("J’écoute");
        setVoiceDetail("J’attends la prochaine intervention du client.");
        try {
          recognition.start();
        } catch {
          setVoiceState("En attente");
          setVoiceDetail("Impossible de relancer l’écoute.");
        }
        return;
      }

      setVoiceState(callFinished ? "Terminé" : "Pause");
    };

    try {
      recognition.start();
    } catch {
      setVoiceState("En attente");
      setVoiceDetail("Impossible de démarrer l’écoute.");
    }
  }

  async function sendConversation(content: string) {
    const trimmed = content.trim();
    if (!trimmed || busy || finalizedRef.current) {
      return;
    }

    stopRecognition();
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    setVoiceState("Analyse en cours");
    setVoiceDetail("Le conseiller analyse la réponse du client.");
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
      autoFinalizeRef.current = Boolean(payload.readyToFinalize);

      const afterSpeech = async () => {
        if (manualEndRef.current || autoFinalizeRef.current) {
          await finalizeConversation(true);
          return;
        }

        if (callActive && !callPaused && !callFinished) {
          startListeningCapture();
          return;
        }

        if (callFinished) {
          setVoiceState("Terminé");
        } else if (callPaused) {
          setVoiceState("Pause");
        }
      };

      await playAgentSpeech(advisorContent, agentKey, afterSpeech);
    } finally {
      setBusy(false);
    }
  }

  async function startCall() {
    if (callActive && !callFinished) {
      return;
    }

    finalizedRef.current = false;
    manualEndRef.current = false;
    autoFinalizeRef.current = false;
    setCallFinished(false);
    setCallPaused(false);
    setCallActive(true);
    setBusy(false);
    setMessages([]);
    setInput("");
    setFinalizeStatuses([]);
    setPhase("accueil");
    setProgress(5);
    setSummary("Appel vocal en cours d’initialisation.");
    setNextAction("Initialisation de l’appel vocal...");
    setReadyToFinalize(false);
    setVoiceState("En attente");
    setVoiceDetail("Autorisation du microphone en cours.");
    setTextFallbackOpen(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setCallActive(false);
      setVoiceState("En attente");
      setVoiceDetail("Autorisation du microphone refusée.");
      return;
    }

    const greeting = sodecAgents[agentKey].firstMessage;
    setMessages([{ role: "assistant", content: greeting }]);
    await playAgentSpeech(greeting, agentKey, () => {
      if (callActive && !callPaused && !callFinished) {
        startListeningCapture();
      }
    });
  }

  function pauseCall() {
    if (!callActive || callFinished) {
      return;
    }

    const nextPaused = !callPaused;
    setCallPaused(nextPaused);
    stopRecognition();
    stopAudioPlayback();
    setVoiceState(nextPaused ? "Pause" : "En attente");
    setVoiceDetail(nextPaused ? "Appel en pause." : "Reprise de l’appel.");

    if (!nextPaused) {
      startListeningCapture();
    }
  }

  async function finalizeConversation(auto = false) {
    if (finalizedRef.current && !auto) {
      return;
    }

    finalizedRef.current = true;
    setCallFinished(true);
    setCallActive(false);
    setCallPaused(false);
    stopRecognition();
    stopAudioPlayback();
    setVoiceState("Finalisation");
    setVoiceDetail("Création de la synthèse, de la feuille et du rendez-vous si nécessaire.");
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
            ? `Document et feuille mis à jour${transcriptPayload.documentUrl ? `: ${transcriptPayload.documentUrl}` : "."}`
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

    setVoiceState("Terminé");
    setVoiceDetail("La conversation est terminée.");
  }

  if (!unlocked) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <p className="eyebrow">SODEC Gabon</p>
          <h1>Accès démo exécutif</h1>
          <p className="login-copy">
            Utilisez le code pour ouvrir l’interface de démonstration destinée aux équipes SODEC.
          </p>
          <form className="login-form" onSubmit={unlockDashboard}>
            <label>
              Code d’accès
              <input
                autoFocus
                inputMode="text"
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder="Saisir le code"
                type="password"
                value={accessCode}
              />
            </label>
            <label className="remember-row">
              <input checked={rememberAccess} onChange={(event) => setRememberAccess(event.target.checked)} type="checkbox" />
              Mémoriser cet appareil
            </label>
            <button type="submit">Ouvrir la démo</button>
            {unlockError ? <p className="error">{unlockError}</p> : null}
          </form>
          <p className="login-footnote">Code de démonstration: {DEMO_ACCESS_CODE}</p>
        </section>
      </main>
    );
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
          <button className={key === agentKey ? "active" : ""} key={key} onClick={() => resetConversation(key)} type="button">
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
              <h2>Appel vocal</h2>
              <p>{nextAction}</p>
            </div>
            <div className="voice-actions">
              <div className="voice-controls">
                <button className="secondary" onClick={startCall} type="button">
                  Démarrer l’appel vocal
                </button>
                <button className="secondary ghost" disabled={!callActive} onClick={pauseCall} type="button">
                  {callPaused ? "Reprendre" : "Pause"}
                </button>
                <button className="secondary ghost" disabled={!callActive && !readyToFinalize} onClick={() => void finalizeConversation(false)} type="button">
                  Terminer
                </button>
              </div>
              <small>
                {voiceState} · {voiceDetail}
              </small>
            </div>
          </div>

          <div className="messages" aria-live="polite">
            {messages.length ? (
              messages.map((message, index) => (
                <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                  <strong>{message.role === "user" ? "Client" : "Conseiller SODEC"}</strong>
                  <p>{message.content}</p>
                </div>
              ))
            ) : (
              <div className="message assistant">
                <strong>Conseiller SODEC</strong>
                <p>Appuyez sur Démarrer l’appel vocal pour lancer la conversation.</p>
              </div>
            )}
            {busy ? (
              <div className="message assistant loading">
                <strong>Conseiller SODEC</strong>
                <p>Analyse de la réponse et préparation de la prochaine question...</p>
              </div>
            ) : null}
          </div>

          <details className="fallback-panel" open={textFallbackOpen} onToggle={(event) => setTextFallbackOpen(event.currentTarget.open)}>
            <summary>Mode texte de secours</summary>
            <div className="fallback-panel-body">
              <textarea
                aria-label="Mode texte de secours"
                onChange={(event) => setInput(event.target.value)}
                placeholder="Utiliser uniquement si le micro est indisponible"
                rows={4}
                value={input}
              />
              <div className="fallback-actions">
                <button className="ghost" onClick={() => setInput(agent.sampleCustomerLine)} type="button">
                  Exemple
                </button>
                <button disabled={busy} onClick={() => void sendConversation(input)} type="button">
                  {busy ? "Analyse" : "Envoyer"}
                </button>
              </div>
            </div>
          </details>
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
            <button disabled={!readyToFinalize} onClick={() => void finalizeConversation(false)} type="button">
              Finaliser le dossier
            </button>
            <small className="hint">{readyToFinalize ? agent.successLabel : "La finalisation se déclenche automatiquement quand le dossier est complet."}</small>
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
            <h2>Journal de l’appel</h2>
            <pre>{transcript}</pre>
          </section>
        </aside>
      </section>
    </main>
  );
}

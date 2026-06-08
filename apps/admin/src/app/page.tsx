"use client";

import { useMemo, useState } from "react";
import { sodecAgents, type SodecAgentKey } from "../lib/sodec-agents";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const agentKeys = Object.keys(sodecAgents) as SodecAgentKey[];

export default function DashboardPage() {
  const [agentKey, setAgentKey] = useState<SodecAgentKey>("loan");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: sodecAgents.loan.firstMessage }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [appointmentStatus, setAppointmentStatus] = useState<string | null>(null);
  const agent = sodecAgents[agentKey];

  const transcript = useMemo(
    () => messages.map((message) => `${message.role === "user" ? "Client" : "Agent"}: ${message.content}`).join("\n"),
    [messages]
  );

  function switchAgent(nextAgent: SodecAgentKey) {
    setAgentKey(nextAgent);
    setMessages([{ role: "assistant", content: sodecAgents[nextAgent].firstMessage }]);
    setInput("");
    setAppointmentStatus(null);
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

    try {
      const response = await fetch("/api/demo-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agent: agentKey, messages: nextMessages })
      });
      const payload = (await response.json()) as { content?: string; error?: string };
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: payload.content ?? `Erreur demo: ${payload.error ?? "réponse indisponible"}`
        }
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function playLastAgentMessage() {
    const last = [...messages].reverse().find((message) => message.role === "assistant");
    if (!last) {
      return;
    }

    const response = await fetch("/api/demo-tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: last.content })
    });

    if (!response.ok) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "La synthèse vocale ElevenLabs n'est pas encore configurée." }
      ]);
      return;
    }

    const audio = new Audio(URL.createObjectURL(await response.blob()));
    await audio.play();
  }

  async function requestAppointment(formData: FormData) {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        phone: formData.get("phone"),
        reason: `${agent.title}: ${formData.get("reason")}`,
        preferredDate: formData.get("preferredDate")
      })
    });
    const payload = (await response.json()) as { status: string };
    setAppointmentStatus(payload.status);
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">SODEC Gabon</p>
          <h1>AI Voice Agent Browser Demo</h1>
        </div>
        <div className="auth-pill">Français uniquement</div>
      </header>

      <section className="agent-tabs" aria-label="Agents SODEC">
        {agentKeys.map((key) => (
          <button
            className={key === agentKey ? "active" : ""}
            key={key}
            onClick={() => switchAgent(key)}
            type="button"
          >
            <span>{sodecAgents[key].title}</span>
            <small>{sodecAgents[key].channel}</small>
          </button>
        ))}
      </section>

      <section className="demo-shell">
        <div className="conversation-panel">
          <div className="panel-header">
            <div>
              <h2>{agent.title}</h2>
              <p>{agent.openingQuestion}</p>
            </div>
            <button className="secondary" onClick={playLastAgentMessage} type="button">
              Lire la voix
            </button>
          </div>

          <div className="messages" aria-live="polite">
            {messages.map((message, index) => (
              <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                <strong>{message.role === "user" ? "Client" : "Agent"}</strong>
                <p>{message.content}</p>
              </div>
            ))}
          </div>

          <div className="composer">
            <input
              aria-label="Message client"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void sendMessage();
                }
              }}
              placeholder="Tapez une phrase de démonstration en français"
              value={input}
            />
            <button disabled={busy} onClick={sendMessage} type="button">
              {busy ? "En cours" : "Envoyer"}
            </button>
          </div>
        </div>

        <aside className="side-panel">
          <h2>Rendez-vous</h2>
          <form action={requestAppointment}>
            <label>
              Nom
              <input name="name" required />
            </label>
            <label>
              Téléphone
              <input name="phone" required />
            </label>
            <label>
              Date souhaitée
              <input name="preferredDate" required type="datetime-local" />
            </label>
            <label>
              Motif
              <textarea name="reason" required rows={4} />
            </label>
            <button type="submit">Préparer le rendez-vous</button>
          </form>
          {appointmentStatus ? <p className="status">Statut: {appointmentStatus}</p> : null}

          <h2>Transcript</h2>
          <pre>{transcript}</pre>
        </aside>
      </section>
    </main>
  );
}

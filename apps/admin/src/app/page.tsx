const workflows = [
  {
    name: "Préqualification particulier",
    channel: "Téléphone",
    status: "Actif",
    nextStep: "Montant demandé",
    calls: 18
  },
  {
    name: "Recouvrement",
    channel: "Téléphone",
    status: "Identité requise",
    nextStep: "Vérification avant détails",
    calls: 9
  },
  {
    name: "Banque vocale WhatsApp",
    channel: "WhatsApp",
    status: "Démo",
    nextStep: "Note vocale entrante",
    calls: 14
  },
  {
    name: "Financement PME",
    channel: "Téléphone",
    status: "Actif",
    nextStep: "Nom de l'entreprise",
    calls: 7
  }
];

const escalations = [
  "Fraude",
  "Sujet juridique",
  "Colère",
  "Maladie",
  "Décès",
  "Litige de paiement",
  "Demande d'un conseiller"
];

const promises = [
  { client: "+241 ** ** 34 56", amount: "85 000 FCFA", date: "2026-06-12", status: "Promis" },
  { client: "+241 ** ** 18 22", amount: "42 500 FCFA", date: "2026-06-14", status: "A confirmer" }
];

export default function DashboardPage() {
  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">SODEC Gabon</p>
          <h1>AI Voice Agent Operations</h1>
        </div>
        <div className="auth-pill">Admin token requis</div>
      </header>

      <section className="metric-grid" aria-label="Indicateurs">
        <div className="metric">
          <span>Conversations demo</span>
          <strong>48</strong>
        </div>
        <div className="metric">
          <span>Transferts humains</span>
          <strong>6</strong>
        </div>
        <div className="metric">
          <span>Consentements transcript</span>
          <strong>91%</strong>
        </div>
        <div className="metric">
          <span>Rétention</span>
          <strong>90 jours</strong>
        </div>
      </section>

      <section className="split">
        <div>
          <h2>Workflows</h2>
          <div className="table">
            <div className="row heading">
              <span>Parcours</span>
              <span>Canal</span>
              <span>Etat</span>
              <span>Prochaine question</span>
              <span>Volume</span>
            </div>
            {workflows.map((workflow) => (
              <div className="row" key={workflow.name}>
                <span>{workflow.name}</span>
                <span>{workflow.channel}</span>
                <span>{workflow.status}</span>
                <span>{workflow.nextStep}</span>
                <span>{workflow.calls}</span>
              </div>
            ))}
          </div>
        </div>

        <aside>
          <h2>Escalade obligatoire</h2>
          <ul>
            {escalations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="split lower">
        <div>
          <h2>Promesses de paiement</h2>
          <div className="table compact">
            <div className="row heading">
              <span>Client</span>
              <span>Montant</span>
              <span>Date</span>
              <span>Etat</span>
            </div>
            {promises.map((promise) => (
              <div className="row" key={`${promise.client}-${promise.date}`}>
                <span>{promise.client}</span>
                <span>{promise.amount}</span>
                <span>{promise.date}</span>
                <span>{promise.status}</span>
              </div>
            ))}
          </div>
        </div>

        <aside>
          <h2>Garde-fous</h2>
          <dl>
            <div>
              <dt>Langue</dt>
              <dd>Français uniquement</dd>
            </div>
            <div>
              <dt>Crédit</dt>
              <dd>Préqualification, jamais garantie</dd>
            </div>
            <div>
              <dt>Recouvrement</dt>
              <dd>Identité avant détails de paiement</dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
}


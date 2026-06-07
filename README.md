# SODEC Gabon AI Voice Agent Demo

Production-shaped demo for SODEC Gabon voice and WhatsApp banking workflows. The backend is Fastify with TypeScript, Prisma/PostgreSQL, Redis/BullMQ, Twilio Voice and WhatsApp webhooks, Twilio Media Streams, OpenAI Realtime API, and ElevenLabs TTS. The admin dashboard is a Next.js operations view.

## Workflows

- Phone individual loan préqualification.
- Phone collections and payment promise.
- WhatsApp voice banking demo.
- Phone SME financing intake.

The agent speaks French only, asks one question at a time, never approves loans, never guarantees financing, and uses "préqualification" rather than approval language. Collections verifies identity before payment details.

## Local Run

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev:api
npm run dev:admin
```

API: `http://localhost:3000`

Admin: `http://localhost:3001`

## Twilio URLs

With `PUBLIC_BASE_URL=https://your-public-host.example`:

- Voice webhook: `https://your-public-host.example/webhooks/twilio/voice`
- WhatsApp webhook: `https://your-public-host.example/webhooks/twilio/whatsapp`
- Media Stream WebSocket: `wss://your-public-host.example/twilio/media-stream`

## Required Environment Variables

```bash
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WHATSAPP_NUMBER=
PUBLIC_BASE_URL=
DATABASE_URL=
REDIS_URL=
HUMAN_TRANSFER_PHONE_NUMBER=
ADMIN_DEMO_TOKEN=
DATA_RETENTION_DAYS=90
TRANSCRIPT_CONSENT_REQUIRED=true
```

## Verification

```bash
npm install
docker compose config
npm run typecheck
npm run lint
npm test
npx prisma generate
npx prisma migrate dev
npm run build
```

## Demo Phone Script

1. Call the Twilio number.
2. Say: "Bonjour, je veux faire une préqualification pour un crédit personnel."
3. Answer the loan amount question.
4. Say: "Je cherche un financement pour ma PME à Libreville."
5. Confirm the agent switches to SME intake.
6. Say: "J'ai reçu un rappel pour mon échéance en retard."
7. Confirm the agent asks to verify identity before payment details.
8. Say: "Je veux parler à un conseiller."
9. Confirm human escalation is triggered.

## Demo WhatsApp Script

1. Send a WhatsApp voice note to the Twilio WhatsApp sandbox or approved number.
2. Say: "Bonjour SODEC, je veux connaître le solde de mon compte."
3. Confirm the demo replies in French and treats the message as WhatsApp voice banking.
4. Send: "Je conteste ce paiement."
5. Confirm the workflow marks the conversation for human transfer.

## Known Limitations

- OpenAI Realtime and ElevenLabs clients are wired for production credentials, but local tests do not call paid external APIs.
- Admin auth is a placeholder bearer token and must be replaced with a real identity provider before production.
- The dashboard currently shows demo operations data; connect it to Prisma queries for a live pilot.
- Speech-to-text and WhatsApp media transcription are represented as queued integration paths and need provider-specific production hardening.


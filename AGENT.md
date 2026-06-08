# Agent Operating Prompt

Build a production-grade SODEC Gabon AI voice agent demo for Paretoclients.

## Product

Use cases:

1. Phone-based individual loan prequalification.
2. Phone-based collections/payment promise.
3. WhatsApp voice banking demo.
4. Phone-based SME financing intake.

Core behavior:

- One Twilio phone number handles loan prequalification, collections, and SME financing through intent detection.
- WhatsApp handles voice banking demo.
- Agent speaks French only.
- Tone is warm, professional, and locally adapted for Gabon.
- Never approve loans.
- Never guarantee financing.
- Use "préqualification", not "approbation".
- Ask one question at a time.
- Escalate to a human for fraud, legal issues, anger, illness, death, payment disputes, or user request.
- Collections must verify identity before mentioning payment details.

Required stack:

- Node.js TypeScript backend.
- Fastify.
- PostgreSQL and Prisma.
- Redis and BullMQ.
- Twilio Voice, Media Streams, and WhatsApp.
- OpenAI Realtime API.
- ElevenLabs TTS and Conversational AI agents.
- Next.js browser demo and admin dashboard.
- Docker Compose.
- GitHub Actions CI.
- Render backend deployment.
- Vercel frontend deployment.

Security:

- Do not commit secrets.
- Use `.env.example` only for placeholders.
- Validate Twilio signatures.
- Mask PII in logs.
- Add rate limiting.
- Add transcript consent.
- Add data retention config.
- Add admin auth placeholder.

Execution method:

- Use Superpowers-style spec, plan, implementation, verification.
- Prefer small, clear diffs.
- Avoid vague criteria and unnecessary refactors.
- Verify before claiming completion.


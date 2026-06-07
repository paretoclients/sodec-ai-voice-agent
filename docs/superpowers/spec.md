# SODEC Gabon AI Voice Agent Spec

## Goal

Build a production-shaped demo for SODEC Gabon that handles phone and WhatsApp voice banking workflows in French with clear safety, compliance, and escalation behavior.

## Required Workflows

- Phone-based individual loan prequalification.
- Phone-based collections and payment promise.
- WhatsApp voice banking demo.
- Phone-based SME financing intake.

## Core Product Rules

- One Twilio phone number handles loan prequalification, collections, and SME financing through intent detection.
- WhatsApp handles the voice banking demo.
- The agent speaks French only.
- Tone is warm, professional, and locally adapted for Gabon.
- The agent never approves loans or guarantees financing.
- The agent uses "préqualification", not "approbation".
- The agent asks one question at a time.
- The agent escalates to a human for fraud, legal issues, anger, illness, death, payment disputes, or explicit user request.
- Collections must verify identity before mentioning payment details.

## Security Rules

- Validate Twilio signatures.
- Mask PII in logs.
- Add rate limiting.
- Add transcript consent flag.
- Add data retention configuration.
- Add an admin auth placeholder.
- Commit only `.env.example`; never commit secrets.

## Required Stack

- Node.js TypeScript backend.
- Fastify.
- PostgreSQL with Prisma.
- Redis with BullMQ.
- Twilio Voice, Media Streams, and WhatsApp.
- OpenAI Realtime API.
- ElevenLabs TTS.
- Next.js admin dashboard.
- Docker Compose.
- GitHub Actions CI.


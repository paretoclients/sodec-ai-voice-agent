# Production Checklist

## Credentials

- Store OpenAI, ElevenLabs, Twilio, database, Redis, and admin tokens in a secrets manager.
- Rotate Twilio auth token if it has ever been shared outside secret storage.
- Use restricted API keys where the provider supports them.

## Telephony

- Configure Twilio Voice webhook: `POST {PUBLIC_BASE_URL}/webhooks/twilio/voice`.
- Configure Twilio WhatsApp webhook: `POST {PUBLIC_BASE_URL}/webhooks/twilio/whatsapp`.
- Configure Media Streams from TwiML to `wss://{PUBLIC_BASE_HOST}/twilio/media-stream`.
- Keep Twilio signature validation enabled in every non-test environment.

## Safety

- Keep French-only system prompts active.
- Never use loan approval language in agent messages.
- Keep collections identity verification before any payment details.
- Route fraud, legal issues, anger, illness, death, payment disputes, and human requests to `HUMAN_TRANSFER_PHONE_NUMBER`.

## Data

- Persist only masked transcript content unless explicit consent is captured.
- Hash caller phone numbers before storage.
- Apply the retention window from `DATA_RETENTION_DAYS`.
- Review audit logs weekly during pilot operation.

## Operations

- Run CI on every branch.
- Run Prisma migrations before application deployment.
- Monitor OpenAI, ElevenLabs, Twilio, Redis, PostgreSQL, and API error rates.
- Add a real admin identity provider before production access.


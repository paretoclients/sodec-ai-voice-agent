# Deployment

## Render Backend

Render uses `render.yaml` at the repo root. It defines:

- `sodec-ai-voice-agent-api` Docker web service.
- `sodec-ai-voice-agent-db` PostgreSQL database.
- `sodec-ai-voice-agent-redis` key value service.

The blueprint intentionally uses `sync: false` for secrets so no secret values are committed.

## Vercel Frontend

Deploy `apps/admin` as the frontend. Required Vercel environment variables:

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `ELEVENLABS_AGENT_LOAN_ID`
- `ELEVENLABS_AGENT_COLLECTIONS_ID`
- `ELEVENLABS_AGENT_WHATSAPP_ID`
- `ELEVENLABS_AGENT_SME_ID`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

## Google Docs and Sheets Transcript Requirements

To write transcripts to Google Docs and Sheets, provide:

- A Google Cloud service account email.
- The service account private key.
- Calendar API, Docs API, Sheets API, and Drive API enabled.
- A calendar shared with the service account.
- A Drive folder shared with the service account for generated transcript docs.
- A Sheet ID or permission to create a new Sheet in the shared folder.


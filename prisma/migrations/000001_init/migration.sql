CREATE TYPE "Channel" AS ENUM ('PHONE', 'WHATSAPP');
CREATE TYPE "Intent" AS ENUM ('LOAN_PREQUALIFICATION', 'COLLECTIONS', 'WHATSAPP_VOICE_BANKING', 'SME_FINANCING', 'UNKNOWN');
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ESCALATED', 'COMPLETED', 'ABANDONED');
CREATE TYPE "MessageRole" AS ENUM ('USER', 'AGENT', 'SYSTEM');

CREATE TABLE "Caller" (
  "id" TEXT NOT NULL,
  "phoneMasked" TEXT NOT NULL,
  "phoneHash" TEXT NOT NULL,
  "displayName" TEXT,
  "locale" TEXT NOT NULL DEFAULT 'fr-GA',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Caller_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "callerId" TEXT,
  "channel" "Channel" NOT NULL,
  "intent" "Intent" NOT NULL,
  "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
  "transcriptConsent" BOOLEAN NOT NULL DEFAULT false,
  "identityVerified" BOOLEAN NOT NULL DEFAULT false,
  "escalationReason" TEXT,
  "currentState" TEXT NOT NULL DEFAULT 'intent_detection',
  "collectedFields" JSONB NOT NULL DEFAULT '{}',
  "twilioCallSid" TEXT,
  "twilioMessageSid" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" "MessageRole" NOT NULL,
  "contentMasked" TEXT NOT NULL,
  "audioUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentPromise" (
  "id" TEXT NOT NULL,
  "callerId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "amountCfa" INTEGER NOT NULL,
  "promisedFor" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROMISED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentPromise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT,
  "eventType" TEXT NOT NULL,
  "details" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetentionSetting" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "retentionDays" INTEGER NOT NULL DEFAULT 90,
  "transcriptStore" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RetentionSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Caller_phoneHash_key" ON "Caller"("phoneHash");
CREATE INDEX "Conversation_channel_intent_status_idx" ON "Conversation"("channel", "intent", "status");
CREATE INDEX "Conversation_createdAt_idx" ON "Conversation"("createdAt");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "PaymentPromise_promisedFor_idx" ON "PaymentPromise"("promisedFor");
CREATE INDEX "AuditLog_eventType_createdAt_idx" ON "AuditLog"("eventType", "createdAt");
CREATE UNIQUE INDEX "RetentionSetting_name_key" ON "RetentionSetting"("name");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "Caller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentPromise" ADD CONSTRAINT "PaymentPromise_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "Caller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentPromise" ADD CONSTRAINT "PaymentPromise_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;


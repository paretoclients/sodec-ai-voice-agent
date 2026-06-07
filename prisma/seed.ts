import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function phoneHash(phone: string): string {
  return createHash("sha256").update(phone).digest("hex");
}

async function main(): Promise<void> {
  const caller = await prisma.caller.upsert({
    where: { phoneHash: phoneHash("+24177123456") },
    update: {},
    create: {
      phoneMasked: "+241 ** ** 34 56",
      phoneHash: phoneHash("+24177123456"),
      displayName: "Client demo"
    }
  });

  const workflows = [
    { channel: "PHONE", intent: "LOAN_PREQUALIFICATION", currentState: "loan_amount" },
    { channel: "PHONE", intent: "COLLECTIONS", currentState: "identity_verification" },
    { channel: "WHATSAPP", intent: "WHATSAPP_VOICE_BANKING", currentState: "voice_banking_menu" },
    { channel: "PHONE", intent: "SME_FINANCING", currentState: "business_name" }
  ] as const;

  for (const workflow of workflows) {
    await prisma.conversation.create({
      data: {
        callerId: caller.id,
        channel: workflow.channel,
        intent: workflow.intent,
        transcriptConsent: true,
        currentState: workflow.currentState,
        messages: {
          create: {
            role: "SYSTEM",
            contentMasked: `Conversation demo ${workflow.intent}`
          }
        }
      }
    });
  }

  await prisma.retentionSetting.upsert({
    where: { name: "default" },
    update: { retentionDays: Number(process.env.DATA_RETENTION_DAYS ?? 90) },
    create: {
      name: "default",
      retentionDays: Number(process.env.DATA_RETENTION_DAYS ?? 90),
      transcriptStore: true
    }
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });


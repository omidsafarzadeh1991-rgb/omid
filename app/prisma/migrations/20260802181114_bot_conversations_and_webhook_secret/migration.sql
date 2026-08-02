-- AlterTable
ALTER TABLE "BotIntegration" ADD COLUMN "encryptedWebhookSecret" TEXT;

-- CreateTable
CREATE TABLE "BotConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalChatId" TEXT NOT NULL,
    "history" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BotConversation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BotConversation_clinicId_platform_externalChatId_key" ON "BotConversation"("clinicId", "platform", "externalChatId");

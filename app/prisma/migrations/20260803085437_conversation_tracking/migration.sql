-- CreateTable
CREATE TABLE "ConversationNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "authorStaffId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationNote_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ConversationNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "BotConversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ConversationNote_authorStaffId_fkey" FOREIGN KEY ("authorStaffId") REFERENCES "StaffUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BotConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalChatId" TEXT NOT NULL,
    "history" TEXT NOT NULL DEFAULT '[]',
    "patientName" TEXT,
    "patientPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assignedStaffId" TEXT,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageText" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BotConversation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BotConversation_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "StaffUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BotConversation" ("clinicId", "createdAt", "externalChatId", "history", "id", "platform", "updatedAt") SELECT "clinicId", "createdAt", "externalChatId", "history", "id", "platform", "updatedAt" FROM "BotConversation";
DROP TABLE "BotConversation";
ALTER TABLE "new_BotConversation" RENAME TO "BotConversation";
CREATE INDEX "BotConversation_clinicId_status_idx" ON "BotConversation"("clinicId", "status");
CREATE UNIQUE INDEX "BotConversation_clinicId_platform_externalChatId_key" ON "BotConversation"("clinicId", "platform", "externalChatId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ConversationNote_conversationId_createdAt_idx" ON "ConversationNote"("conversationId", "createdAt");

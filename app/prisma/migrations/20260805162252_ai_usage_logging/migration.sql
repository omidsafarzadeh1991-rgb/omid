-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "responseMs" INTEGER NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageLog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MessageLog_clinicId_createdAt_idx" ON "MessageLog"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageLog_clinicId_resolution_createdAt_idx" ON "MessageLog"("clinicId", "resolution", "createdAt");

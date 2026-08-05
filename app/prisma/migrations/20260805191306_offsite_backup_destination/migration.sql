-- CreateTable
CREATE TABLE "BackupDestination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT,
    "s3Endpoint" TEXT,
    "s3Bucket" TEXT,
    "s3Region" TEXT,
    "encryptedS3AccessKey" TEXT,
    "encryptedS3SecretKey" TEXT,
    "sftpHost" TEXT,
    "sftpPort" INTEGER,
    "sftpUsername" TEXT,
    "encryptedSftpPassword" TEXT,
    "sftpRemotePath" TEXT,
    "scheduleHour" INTEGER NOT NULL DEFAULT 2,
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "encryptedFileKey" TEXT,
    "lastRunAt" DATETIME,
    "lastRunOk" BOOLEAN,
    "lastRunError" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BackupDestination_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BackupDestination_clinicId_key" ON "BackupDestination"("clinicId");

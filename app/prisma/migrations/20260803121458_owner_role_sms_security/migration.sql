-- CreateTable
CREATE TABLE "SecurityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "detail" TEXT,
    "actorStaffId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityLog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SecurityLog_actorStaffId_fkey" FOREIGN KEY ("actorStaffId") REFERENCES "StaffUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SmsSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'KAVENEGAR',
    "encryptedApiKey" TEXT,
    "senderNumber" TEXT,
    "confirmationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder24hEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder2to4hEnabled" BOOLEAN NOT NULL DEFAULT true,
    "confirmationTemplate" TEXT,
    "reminder24hTemplate" TEXT,
    "reminder2to4hTemplate" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmsSettings_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppointmentReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    CONSTRAINT "AppointmentReminder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SecurityLog_clinicId_createdAt_idx" ON "SecurityLog"("clinicId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SmsSettings_clinicId_key" ON "SmsSettings"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentReminder_appointmentId_type_key" ON "AppointmentReminder"("appointmentId", "type");

-- Promote the earliest-created staff member of each clinic (the account
-- created by /setup, before this migration OWNER didn't exist) to OWNER.
-- registerClinic() always creates exactly one staff row atomically with the
-- clinic itself, so "first staff row per clinicId" is always that founding
-- account, never a staff member added later from the panel.
UPDATE "StaffUser"
SET "role" = 'OWNER'
WHERE "id" IN (
  SELECT "s1"."id"
  FROM "StaffUser" "s1"
  WHERE "s1"."createdAt" = (
    SELECT MIN("s2"."createdAt")
    FROM "StaffUser" "s2"
    WHERE "s2"."clinicId" = "s1"."clinicId"
  )
);

-- DB-level guarantee that a clinic can never end up with a second OWNER,
-- even if application code has a bug - defense in depth alongside the
-- Server Action check.
CREATE UNIQUE INDEX "StaffUser_one_owner_per_clinic"
  ON "StaffUser"("clinicId")
  WHERE "role" = 'OWNER';

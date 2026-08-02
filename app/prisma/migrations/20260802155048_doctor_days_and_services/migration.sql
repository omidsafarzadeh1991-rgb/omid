-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "serviceName" TEXT;

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Service_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Doctor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workStartMin" INTEGER NOT NULL DEFAULT 540,
    "workEndMin" INTEGER NOT NULL DEFAULT 1020,
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "workDays" TEXT NOT NULL DEFAULT '6,0,1,2,3',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Doctor_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Doctor" ("clinicId", "createdAt", "id", "name", "slotMinutes", "workEndMin", "workStartMin") SELECT "clinicId", "createdAt", "id", "name", "slotMinutes", "workEndMin", "workStartMin" FROM "Doctor";
DROP TABLE "Doctor";
ALTER TABLE "new_Doctor" RENAME TO "Doctor";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Service_doctorId_idx" ON "Service"("doctorId");

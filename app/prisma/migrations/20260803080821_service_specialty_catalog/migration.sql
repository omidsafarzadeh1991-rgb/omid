/*
  Warnings:

  - You are about to drop the column `doctorId` on the `Service` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Specialty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Specialty_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_DoctorToService" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DoctorToService_A_fkey" FOREIGN KEY ("A") REFERENCES "Doctor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_DoctorToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_DoctorToSpecialty" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DoctorToSpecialty_A_fkey" FOREIGN KEY ("A") REFERENCES "Doctor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_DoctorToSpecialty_B_fkey" FOREIGN KEY ("B") REFERENCES "Specialty" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Preserve existing doctor <-> service links before Service becomes a
-- clinic-wide catalog: if two doctors already had identically-named
-- services (previously two separate rows, one per doctor), they now merge
-- into a single catalog row, and both doctors keep their link to it via
-- the new join table.
INSERT INTO "_DoctorToService" ("A", "B")
SELECT DISTINCT s."doctorId", canonical."id"
FROM "Service" s
JOIN (
  SELECT "clinicId", "name", MIN("id") AS "id"
  FROM "Service"
  GROUP BY "clinicId", "name"
) canonical ON canonical."clinicId" = s."clinicId" AND canonical."name" = s."name";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Service_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Service" ("id", "clinicId", "name", "price", "createdAt")
SELECT MIN("id"), "clinicId", "name", MAX("price"), MIN("createdAt")
FROM "Service"
GROUP BY "clinicId", "name";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
CREATE UNIQUE INDEX "Service_clinicId_name_key" ON "Service"("clinicId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_clinicId_name_key" ON "Specialty"("clinicId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "_DoctorToService_AB_unique" ON "_DoctorToService"("A", "B");

-- CreateIndex
CREATE INDEX "_DoctorToService_B_index" ON "_DoctorToService"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DoctorToSpecialty_AB_unique" ON "_DoctorToSpecialty"("A", "B");

-- CreateIndex
CREATE INDEX "_DoctorToSpecialty_B_index" ON "_DoctorToSpecialty"("B");

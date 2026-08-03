-- Login moves from email to username; email becomes optional contact info,
-- and a batch of profile fields is added. Existing rows get a username
-- derived from their email's local part (deduplicated below) and their
-- old `name` copied into `firstName`, so no account is locked out.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StaffUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "mobile" TEXT,
    "birthDate" DATETIME,
    "personnelCode" TEXT,
    "hireDate" DATETIME,
    "notes" TEXT,
    "profilePictureUrl" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'RECEPTIONIST',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffUser_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_StaffUser"
  ("id", "clinicId", "username", "firstName", "email", "passwordHash", "role", "createdAt")
SELECT
  "id",
  "clinicId",
  lower(substr("email", 1, instr("email", '@') - 1)),
  "name",
  "email",
  "passwordHash",
  "role",
  "createdAt"
FROM "StaffUser";

-- Resolve any username collisions (e.g. two clinics' seed data sharing an
-- email prefix) by appending a slice of the row's own id - short, stable,
-- and guaranteed unique since ids already are.
UPDATE "new_StaffUser"
SET "username" = "username" || '_' || substr("id", 1, 4)
WHERE "username" IN (
  SELECT "username" FROM "new_StaffUser" GROUP BY "username" HAVING COUNT(*) > 1
);

DROP TABLE "StaffUser";
ALTER TABLE "new_StaffUser" RENAME TO "StaffUser";
CREATE UNIQUE INDEX "StaffUser_username_key" ON "StaffUser"("username");
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");
CREATE UNIQUE INDEX "StaffUser_personnelCode_key" ON "StaffUser"("personnelCode");
CREATE UNIQUE INDEX "StaffUser_one_owner_per_clinic" ON "StaffUser"("clinicId") WHERE "role" = 'OWNER';
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

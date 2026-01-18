/*
  Warnings:

  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "defaultCurrency" TEXT,
    "defaultBillingCycle" TEXT,
    "notifyDaysBefore" INTEGER,
    "lastNotificationSentAt" DATETIME,
    "pushToken" TEXT
);
INSERT INTO "new_User" ("createdAt", "defaultBillingCycle", "defaultCurrency", "email", "id", "lastNotificationSentAt", "notifyDaysBefore", "passwordHash", "pushToken") SELECT "createdAt", "defaultBillingCycle", "defaultCurrency", "email", "id", "lastNotificationSentAt", "notifyDaysBefore", "passwordHash", "pushToken" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

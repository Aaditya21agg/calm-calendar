/*
  Warnings:

  - Added the required column `userId` to the `Workflow` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial',
    "trialEndsAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Workflow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sourceCal" TEXT NOT NULL,
    "targetCal" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "lastSynced" DATETIME,
    "lastSyncedAt" DATETIME,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Workflow" ("accessToken", "enabled", "id", "lastSynced", "lastSyncedAt", "name", "refreshToken", "sourceCal", "targetCal") SELECT "accessToken", "enabled", "id", "lastSynced", "lastSyncedAt", "name", "refreshToken", "sourceCal", "targetCal" FROM "Workflow";
DROP TABLE "Workflow";
ALTER TABLE "new_Workflow" RENAME TO "Workflow";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

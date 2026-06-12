/*
  Warnings:

  - Added the required column `sourceGoogleAccountId` to the `Workflow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetGoogleAccountId` to the `Workflow` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "GoogleAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "GoogleAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAccount_userId_email_key" ON "GoogleAccount"("userId", "email");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Workflow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sourceCal" TEXT NOT NULL,
    "targetCal" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSynced" DATETIME,
    "lastSyncedAt" DATETIME,
    "userId" INTEGER NOT NULL,
    "sourceGoogleAccountId" INTEGER NOT NULL,
    "targetGoogleAccountId" INTEGER NOT NULL,
    CONSTRAINT "Workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Workflow_sourceGoogleAccountId_fkey" FOREIGN KEY ("sourceGoogleAccountId") REFERENCES "GoogleAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Workflow_targetGoogleAccountId_fkey" FOREIGN KEY ("targetGoogleAccountId") REFERENCES "GoogleAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
DROP TABLE "Workflow";
ALTER TABLE "new_Workflow" RENAME TO "Workflow";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

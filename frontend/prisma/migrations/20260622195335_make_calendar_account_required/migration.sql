/*
  Warnings:

  - Made the column `googleAccountId` on table `WorkflowSourceCalendar` required. This step will fail if there are existing NULL values in that column.
  - Made the column `googleAccountId` on table `WorkflowTargetCalendar` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WorkflowSourceCalendar" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workflowId" INTEGER NOT NULL,
    "googleAccountId" INTEGER NOT NULL,
    "calendarId" TEXT NOT NULL,
    "syncToken" TEXT,
    "watchChannelId" TEXT,
    "watchResourceId" TEXT,
    "watchExpiration" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowSourceCalendar_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkflowSourceCalendar_googleAccountId_fkey" FOREIGN KEY ("googleAccountId") REFERENCES "GoogleAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WorkflowSourceCalendar" ("calendarId", "createdAt", "googleAccountId", "id", "syncToken", "watchChannelId", "watchExpiration", "watchResourceId", "workflowId") SELECT "calendarId", "createdAt", "googleAccountId", "id", "syncToken", "watchChannelId", "watchExpiration", "watchResourceId", "workflowId" FROM "WorkflowSourceCalendar";
DROP TABLE "WorkflowSourceCalendar";
ALTER TABLE "new_WorkflowSourceCalendar" RENAME TO "WorkflowSourceCalendar";
CREATE TABLE "new_WorkflowTargetCalendar" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workflowId" INTEGER NOT NULL,
    "googleAccountId" INTEGER NOT NULL,
    "calendarId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowTargetCalendar_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkflowTargetCalendar_googleAccountId_fkey" FOREIGN KEY ("googleAccountId") REFERENCES "GoogleAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WorkflowTargetCalendar" ("calendarId", "createdAt", "googleAccountId", "id", "workflowId") SELECT "calendarId", "createdAt", "googleAccountId", "id", "workflowId" FROM "WorkflowTargetCalendar";
DROP TABLE "WorkflowTargetCalendar";
ALTER TABLE "new_WorkflowTargetCalendar" RENAME TO "WorkflowTargetCalendar";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

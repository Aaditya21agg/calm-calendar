-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WorkflowSourceCalendar" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workflowId" INTEGER NOT NULL,
    "googleAccountId" INTEGER,
    "calendarId" TEXT NOT NULL,
    "syncToken" TEXT,
    "watchChannelId" TEXT,
    "watchResourceId" TEXT,
    "watchExpiration" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowSourceCalendar_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkflowSourceCalendar_googleAccountId_fkey" FOREIGN KEY ("googleAccountId") REFERENCES "GoogleAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkflowSourceCalendar" ("calendarId", "createdAt", "id", "syncToken", "watchChannelId", "watchExpiration", "watchResourceId", "workflowId") SELECT "calendarId", "createdAt", "id", "syncToken", "watchChannelId", "watchExpiration", "watchResourceId", "workflowId" FROM "WorkflowSourceCalendar";
DROP TABLE "WorkflowSourceCalendar";
ALTER TABLE "new_WorkflowSourceCalendar" RENAME TO "WorkflowSourceCalendar";
CREATE TABLE "new_WorkflowTargetCalendar" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workflowId" INTEGER NOT NULL,
    "googleAccountId" INTEGER,
    "calendarId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowTargetCalendar_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkflowTargetCalendar_googleAccountId_fkey" FOREIGN KEY ("googleAccountId") REFERENCES "GoogleAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkflowTargetCalendar" ("calendarId", "createdAt", "id", "workflowId") SELECT "calendarId", "createdAt", "id", "workflowId" FROM "WorkflowTargetCalendar";
DROP TABLE "WorkflowTargetCalendar";
ALTER TABLE "new_WorkflowTargetCalendar" RENAME TO "WorkflowTargetCalendar";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

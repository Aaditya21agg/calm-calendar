-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Workflow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sourceCal" TEXT NOT NULL,
    "targetCal" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "includeTimedEvents" BOOLEAN NOT NULL DEFAULT true,
    "includeAllDayEvents" BOOLEAN NOT NULL DEFAULT true,
    "includeNonBusyEvents" BOOLEAN NOT NULL DEFAULT false,
    "includeTentativeEvents" BOOLEAN NOT NULL DEFAULT false,
    "includeFocusTimeEvents" BOOLEAN NOT NULL DEFAULT false,
    "includeOutOfOfficeEvents" BOOLEAN NOT NULL DEFAULT false,
    "removeSummaryLocation" BOOLEAN NOT NULL DEFAULT false,
    "replacementSummary" TEXT,
    "preserveManualChanges" BOOLEAN NOT NULL DEFAULT false,
    "lastSynced" DATETIME,
    "lastSyncedAt" DATETIME,
    "syncToken" TEXT,
    "watchChannelId" TEXT,
    "watchResourceId" TEXT,
    "watchExpiration" DATETIME,
    "userId" INTEGER NOT NULL,
    "sourceGoogleAccountId" INTEGER NOT NULL,
    "targetGoogleAccountId" INTEGER NOT NULL,
    "syncInProgress" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Workflow_sourceGoogleAccountId_fkey" FOREIGN KEY ("sourceGoogleAccountId") REFERENCES "GoogleAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Workflow_targetGoogleAccountId_fkey" FOREIGN KEY ("targetGoogleAccountId") REFERENCES "GoogleAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Workflow" ("enabled", "id", "includeAllDayEvents", "includeFocusTimeEvents", "includeNonBusyEvents", "includeOutOfOfficeEvents", "includeTentativeEvents", "includeTimedEvents", "lastSynced", "lastSyncedAt", "name", "preserveManualChanges", "removeSummaryLocation", "replacementSummary", "sourceCal", "sourceGoogleAccountId", "syncToken", "targetCal", "targetGoogleAccountId", "userId", "watchChannelId", "watchExpiration", "watchResourceId") SELECT "enabled", "id", "includeAllDayEvents", "includeFocusTimeEvents", "includeNonBusyEvents", "includeOutOfOfficeEvents", "includeTentativeEvents", "includeTimedEvents", "lastSynced", "lastSyncedAt", "name", "preserveManualChanges", "removeSummaryLocation", "replacementSummary", "sourceCal", "sourceGoogleAccountId", "syncToken", "targetCal", "targetGoogleAccountId", "userId", "watchChannelId", "watchExpiration", "watchResourceId" FROM "Workflow";
DROP TABLE "Workflow";
ALTER TABLE "new_Workflow" RENAME TO "Workflow";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

/*
  Warnings:

  - Added the required column `refreshToken` to the `Workflow` table without a default value. This is not possible if the table is not empty.

*/
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
    "refreshToken" TEXT NOT NULL
);
INSERT INTO "new_Workflow" ("accessToken", "enabled", "id", "name", "sourceCal", "targetCal") SELECT "accessToken", "enabled", "id", "name", "sourceCal", "targetCal" FROM "Workflow";
DROP TABLE "Workflow";
ALTER TABLE "new_Workflow" RENAME TO "Workflow";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

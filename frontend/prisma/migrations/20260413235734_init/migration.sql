-- CreateTable
CREATE TABLE "Workflow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sourceCal" TEXT NOT NULL,
    "targetCal" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL
);

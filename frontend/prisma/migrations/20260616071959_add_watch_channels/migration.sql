-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN "watchChannelId" TEXT;
ALTER TABLE "Workflow" ADD COLUMN "watchExpiration" DATETIME;
ALTER TABLE "Workflow" ADD COLUMN "watchResourceId" TEXT;

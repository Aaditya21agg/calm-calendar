-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial',
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleAccount" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "GoogleAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" SERIAL NOT NULL,
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
    "lastSynced" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "syncToken" TEXT,
    "watchChannelId" TEXT,
    "watchResourceId" TEXT,
    "watchExpiration" TIMESTAMP(3),
    "userId" INTEGER NOT NULL,
    "sourceGoogleAccountId" INTEGER NOT NULL,
    "targetGoogleAccountId" INTEGER NOT NULL,
    "syncInProgress" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowSourceCalendar" (
    "id" SERIAL NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "googleAccountId" INTEGER NOT NULL,
    "calendarId" TEXT NOT NULL,
    "syncToken" TEXT,
    "watchChannelId" TEXT,
    "watchResourceId" TEXT,
    "watchExpiration" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowSourceCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTargetCalendar" (
    "id" SERIAL NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "googleAccountId" INTEGER NOT NULL,
    "calendarId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowTargetCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAccount_userId_email_key" ON "GoogleAccount"("userId", "email");

-- AddForeignKey
ALTER TABLE "GoogleAccount" ADD CONSTRAINT "GoogleAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_sourceGoogleAccountId_fkey" FOREIGN KEY ("sourceGoogleAccountId") REFERENCES "GoogleAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_targetGoogleAccountId_fkey" FOREIGN KEY ("targetGoogleAccountId") REFERENCES "GoogleAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowSourceCalendar" ADD CONSTRAINT "WorkflowSourceCalendar_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowSourceCalendar" ADD CONSTRAINT "WorkflowSourceCalendar_googleAccountId_fkey" FOREIGN KEY ("googleAccountId") REFERENCES "GoogleAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTargetCalendar" ADD CONSTRAINT "WorkflowTargetCalendar_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTargetCalendar" ADD CONSTRAINT "WorkflowTargetCalendar_googleAccountId_fkey" FOREIGN KEY ("googleAccountId") REFERENCES "GoogleAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SCHEDULED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slack_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "channelId" TEXT,
    "channelName" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slack_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'SCHEDULED',
    "bullJobId" TEXT,
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "previewUrl" TEXT,
    "delayBetweenMs" INTEGER NOT NULL DEFAULT 2000,
    "hourlyLimit" INTEGER NOT NULL DEFAULT 50,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "slack_connections_userId_key" ON "slack_connections"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "email_jobs_bullJobId_key" ON "email_jobs"("bullJobId");

-- CreateIndex
CREATE INDEX "email_jobs_userId_status_idx" ON "email_jobs"("userId", "status");

-- CreateIndex
CREATE INDEX "email_jobs_status_scheduledAt_idx" ON "email_jobs"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "email_jobs_fromEmail_status_idx" ON "email_jobs"("fromEmail", "status");

-- CreateIndex
CREATE INDEX "email_jobs_batchId_idx" ON "email_jobs"("batchId");

-- AddForeignKey
ALTER TABLE "slack_connections" ADD CONSTRAINT "slack_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_jobs" ADD CONSTRAINT "email_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('SUDO', 'VAKER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "goalAmount" DOUBLE PRECISION,
    "goalVisible" BOOLEAN NOT NULL DEFAULT true,
    "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "ownerId" INTEGER NOT NULL,
    "ownerUsername" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMember" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'VAKER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "invitedUserId" INTEGER,
    "invitedEmail" TEXT,
    "inviterId" INTEGER NOT NULL,
    "inviterName" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_ownerId_idx" ON "Campaign"("ownerId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_isPrivate_idx" ON "Campaign"("isPrivate");

-- CreateIndex
CREATE INDEX "CampaignMember_userId_idx" ON "CampaignMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMember_campaignId_userId_key" ON "CampaignMember"("campaignId", "userId");

-- CreateIndex
CREATE INDEX "Invitation_invitedUserId_idx" ON "Invitation"("invitedUserId");

-- CreateIndex
CREATE INDEX "Invitation_campaignId_idx" ON "Invitation"("campaignId");

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

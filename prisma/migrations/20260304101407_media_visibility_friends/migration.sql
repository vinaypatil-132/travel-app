-- Phase 2.8: Media Visibility & Friend System
-- Safe migration that backfills existing trip_media rows before enforcing NOT NULL

-- CreateEnum
CREATE TYPE "MediaVisibility" AS ENUM ('PUBLIC', 'FRIENDS', 'SELECTED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "FriendStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');

-- Step 1: Add userId as nullable first to allow backfill
ALTER TABLE "trip_media" ADD COLUMN "userId" TEXT;
ALTER TABLE "trip_media" ADD COLUMN "visibility" "MediaVisibility" NOT NULL DEFAULT 'PUBLIC';

-- Step 2: Backfill userId from parent trip owner for any existing rows
UPDATE "trip_media" tm
SET "userId" = t."userId"
FROM "trips" t
WHERE tm."tripId" = t."id";

-- Step 3: Now that all rows are hydrated, enforce NOT NULL
ALTER TABLE "trip_media" ALTER COLUMN "userId" SET NOT NULL;

-- Step 4: Add foreign key constraint
ALTER TABLE "trip_media" ADD CONSTRAINT "trip_media_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes on trip_media
CREATE INDEX "trip_media_userId_idx" ON "trip_media"("userId");
CREATE INDEX "trip_media_visibility_idx" ON "trip_media"("visibility");
CREATE INDEX "trip_media_tripId_visibility_idx" ON "trip_media"("tripId", "visibility");

-- CreateTable: user_friends (bidirectional friend rows)
CREATE TABLE "user_friends" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "status" "FriendStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_friends_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_friends_userId_friendId_key" ON "user_friends"("userId", "friendId");
CREATE INDEX "user_friends_userId_idx" ON "user_friends"("userId");
CREATE INDEX "user_friends_friendId_idx" ON "user_friends"("friendId");

ALTER TABLE "user_friends" ADD CONSTRAINT "user_friends_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_friends" ADD CONSTRAINT "user_friends_friendId_fkey" 
  FOREIGN KEY ("friendId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: media_access (SELECTED visibility grants)
CREATE TABLE "media_access" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "media_access_mediaId_userId_key" ON "media_access"("mediaId", "userId");
CREATE INDEX "media_access_mediaId_idx" ON "media_access"("mediaId");
CREATE INDEX "media_access_userId_idx" ON "media_access"("userId");

ALTER TABLE "media_access" ADD CONSTRAINT "media_access_mediaId_fkey" 
  FOREIGN KEY ("mediaId") REFERENCES "trip_media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_access" ADD CONSTRAINT "media_access_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

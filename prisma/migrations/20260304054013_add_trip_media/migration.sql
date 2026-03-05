-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "trip_media" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "caption" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_media_tripId_idx" ON "trip_media"("tripId");

-- AddForeignKey
ALTER TABLE "trip_media" ADD CONSTRAINT "trip_media_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - A unique constraint covering the columns `[userId,tmdbId]` on the table `Recommendation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_userId_tmdbId_key" ON "Recommendation"("userId", "tmdbId");

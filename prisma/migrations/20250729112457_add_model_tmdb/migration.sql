/*
  Warnings:

  - You are about to drop the column `mediaType` on the `ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `mediaType` on the `Favorite` table. All the data in the column will be lost.
  - You are about to drop the column `posterUrl` on the `Favorite` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Favorite` table. All the data in the column will be lost.
  - You are about to drop the column `mediaType` on the `Rating` table. All the data in the column will be lost.
  - You are about to drop the column `posterUrl` on the `Rating` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Rating` table. All the data in the column will be lost.
  - You are about to drop the column `genreIds` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `mediaType` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `overview` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `popularity` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `posterUrl` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `releaseDate` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `voteAverage` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `mediaType` on the `SeenItem` table. All the data in the column will be lost.
  - You are about to drop the column `posterUrl` on the `SeenItem` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `SeenItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ActivityLog" DROP COLUMN "mediaType",
DROP COLUMN "title";

-- AlterTable
ALTER TABLE "Favorite" DROP COLUMN "mediaType",
DROP COLUMN "posterUrl",
DROP COLUMN "title";

-- AlterTable
ALTER TABLE "Rating" DROP COLUMN "mediaType",
DROP COLUMN "posterUrl",
DROP COLUMN "title";

-- AlterTable
ALTER TABLE "Recommendation" DROP COLUMN "genreIds",
DROP COLUMN "mediaType",
DROP COLUMN "overview",
DROP COLUMN "popularity",
DROP COLUMN "posterUrl",
DROP COLUMN "releaseDate",
DROP COLUMN "title",
DROP COLUMN "voteAverage";

-- AlterTable
ALTER TABLE "SeenItem" DROP COLUMN "mediaType",
DROP COLUMN "posterUrl",
DROP COLUMN "title";

-- CreateTable
CREATE TABLE "Tmdb" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "overview" TEXT,
    "posterUrl" TEXT,
    "releaseDate" TIMESTAMP(3),
    "genreIds" INTEGER[],
    "popularity" DOUBLE PRECISION,
    "voteAverage" DOUBLE PRECISION,
    "mediaType" TEXT NOT NULL,
    "trailerUrl" TEXT,
    "platforms" TEXT[],

    CONSTRAINT "Tmdb_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SeenItem" ADD CONSTRAINT "SeenItem_tmdbId_fkey" FOREIGN KEY ("tmdbId") REFERENCES "Tmdb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_tmdbId_fkey" FOREIGN KEY ("tmdbId") REFERENCES "Tmdb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_tmdbId_fkey" FOREIGN KEY ("tmdbId") REFERENCES "Tmdb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_tmdbId_fkey" FOREIGN KEY ("tmdbId") REFERENCES "Tmdb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_tmdbId_fkey" FOREIGN KEY ("tmdbId") REFERENCES "Tmdb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

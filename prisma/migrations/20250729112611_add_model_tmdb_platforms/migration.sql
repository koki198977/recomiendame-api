/*
  Warnings:

  - The `platforms` column on the `Tmdb` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Tmdb" DROP COLUMN "platforms",
ADD COLUMN     "platforms" JSONB;

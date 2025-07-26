/*
  Warnings:

  - You are about to drop the column `comment` on the `ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `ActivityLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ActivityLog" DROP COLUMN "comment",
DROP COLUMN "rating",
ADD COLUMN     "details" TEXT,
ALTER COLUMN "mediaType" DROP NOT NULL;

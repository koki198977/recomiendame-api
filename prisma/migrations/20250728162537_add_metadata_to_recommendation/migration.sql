-- AlterTable
ALTER TABLE "Recommendation" ADD COLUMN     "genreIds" INTEGER[],
ADD COLUMN     "mediaType" TEXT,
ADD COLUMN     "overview" TEXT,
ADD COLUMN     "popularity" DOUBLE PRECISION,
ADD COLUMN     "posterUrl" TEXT,
ADD COLUMN     "releaseDate" TIMESTAMP(3),
ADD COLUMN     "voteAverage" DOUBLE PRECISION;

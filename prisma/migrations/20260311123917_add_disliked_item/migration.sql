-- CreateTable
CREATE TABLE "DislikedItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DislikedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DislikedItem_userId_tmdbId_key" ON "DislikedItem"("userId", "tmdbId");

-- AddForeignKey
ALTER TABLE "DislikedItem" ADD CONSTRAINT "DislikedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DislikedItem" ADD CONSTRAINT "DislikedItem_tmdbId_fkey" FOREIGN KEY ("tmdbId") REFERENCES "Tmdb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

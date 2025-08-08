-- CreateTable
CREATE TABLE "WishListItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WishListItem_userId_tmdbId_key" ON "WishListItem"("userId", "tmdbId");

-- AddForeignKey
ALTER TABLE "WishListItem" ADD CONSTRAINT "WishListItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishListItem" ADD CONSTRAINT "WishListItem_tmdbId_fkey" FOREIGN KEY ("tmdbId") REFERENCES "Tmdb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

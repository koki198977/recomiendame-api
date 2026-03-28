-- Tabla para registrar vistas de tráiler (Nivel 3: Implicit Feedback)
CREATE TABLE IF NOT EXISTS "TrailerView" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "tmdbId"      INTEGER NOT NULL,
    "watchedSecs" INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailerView_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TrailerView_userId_tmdbId_key" UNIQUE ("userId", "tmdbId"),
    CONSTRAINT "TrailerView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "TrailerView_tmdbId_fkey" FOREIGN KEY ("tmdbId") REFERENCES "Tmdb"("id")
);

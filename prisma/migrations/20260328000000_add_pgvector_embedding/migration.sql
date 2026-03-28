-- Habilitar la extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Agregar columna de embedding al modelo Tmdb
ALTER TABLE "Tmdb" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

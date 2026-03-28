-- Índice HNSW para búsqueda KNN ultra-rápida con distancia coseno
-- Esto hace la búsqueda vectorial ~100x más rápida cuando la tabla crece
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Tmdb_embedding_hnsw_idx"
ON "Tmdb"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

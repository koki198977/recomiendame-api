-- Agregar campos de perfil IA al modelo User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiProfile" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiProfileUpdatedAt" TIMESTAMP(3);

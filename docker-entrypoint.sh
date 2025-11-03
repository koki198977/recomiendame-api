#!/bin/sh

echo "✅ Esperando que la base de datos esté disponible..."

# Esperar hasta que la base de datos responda en el host `db:5432`
until nc -z db 5432; do
  echo "⏳ Esperando a que db:5432 esté disponible..."
  sleep 2
done

echo "✅ Base de datos disponible. Ejecutando migraciones..."
npx prisma generate
npx prisma migrate deploy

echo "🚀 Iniciando la aplicación..."
exec node dist/src/main.js

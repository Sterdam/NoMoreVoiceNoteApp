#!/bin/bash

# VoxKill Production Startup Script

set -e

echo "🚀 Starting VoxKill in production mode..."

# Vérifier les variables d'environnement critiques
required_vars=(
    "MONGODB_URI"
    "REDIS_URL"
    "JWT_SECRET"
    "OPENAI_API_KEY"
    "STRIPE_SECRET_KEY"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set"
        exit 1
    fi
done

# Build frontend
echo "📦 Building frontend..."
cd frontend && npm run build && cd ..

# Copier les fichiers de build
cp -r frontend/dist/* public/

# Démarrer avec PM2
echo "🔧 Starting with PM2..."
pm2 start ecosystem.config.js --env production

# Vérifier le statut
sleep 5
pm2 status

echo "✅ VoxKill is running in production!"
echo "🌐 Access at: https://voxkill.com"
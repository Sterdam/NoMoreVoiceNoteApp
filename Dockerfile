# Build multi-stage optimisé
FROM node:18-alpine AS base

# Installer uniquement les dépendances système nécessaires
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ffmpeg

# Dire à Puppeteer d'utiliser le Chromium installé
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Stage pour les dépendances
FROM base AS deps

# Copier uniquement les fichiers de dépendances
COPY package*.json ./

# Utiliser npm ci pour une installation plus rapide et déterministe
# Nettoyer le cache npm après installation
RUN npm ci --only=production && \
    npm cache clean --force

# Stage pour le build de production
FROM base AS runner

WORKDIR /app

# Copier les node_modules depuis le stage deps
COPY --from=deps /app/node_modules ./node_modules

# Copier le code source
COPY . .

# Créer les dossiers nécessaires
RUN mkdir -p data/sessions data/temp logs && \
    chmod -R 777 data logs

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

CMD ["node", "src/app.js"]
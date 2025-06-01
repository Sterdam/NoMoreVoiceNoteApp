# Build multi-stage pour le frontend React
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Stage de build
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage de production avec Nginx
FROM nginx:alpine AS production
# Copier la config Nginx
COPY nginx.conf /etc/nginx/nginx.conf
# Copier les fichiers buildés
COPY --from=builder /app/dist /usr/share/nginx/html
# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost || exit 1
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
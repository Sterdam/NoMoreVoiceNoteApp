# Utiliser Node.js comme base
FROM node:18-bullseye

# Installation des dépendances minimales pour Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances Node.js
RUN npm install

# Copie du reste du code
COPY . .

# Création des dossiers nécessaires
RUN mkdir -p \
    data/sessions \
    data/temp \
    logs \
    && chmod -R 777 data \
    && chmod -R 777 logs

# Variables d'environnement pour Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 3000

CMD ["npm", "start"]
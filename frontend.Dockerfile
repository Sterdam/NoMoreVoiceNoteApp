FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de configuration
COPY frontend/package*.json ./
COPY frontend/tailwind.config.js ./
COPY frontend/postcss.config.js ./
COPY frontend/vite.config.js ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers
COPY frontend/ .

# Exposer le port
EXPOSE 5173

# Commande de démarrage avec hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
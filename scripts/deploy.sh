#!/bin/bash
# deploy.sh

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Début du déploiement...${NC}"

# Vérification des prérequis
command -v docker >/dev/null 2>&1 || {
    echo -e "${RED}Docker n'est pas installé. Installation...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
}

command -v docker-compose >/dev/null 2>&1 || {
    echo -e "${RED}Docker Compose n'est pas installé. Installation...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
}

# Création des dossiers nécessaires
echo "Création des dossiers..."
mkdir -p data/{sessions,temp,models} logs nginx/{conf.d,ssl,www} certbot/{conf,www}

# Vérification du fichier .env
if [ ! -f .env ]; then
    echo -e "${RED}Fichier .env non trouvé. Création d'un exemple...${NC}"
    cat > .env << EOL
NODE_ENV=production
PORT=3000
DOMAIN=yourdomain.com

# MongoDB
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=$(openssl rand -hex 24)
MONGODB_URI=mongodb://admin:${MONGO_ROOT_PASSWORD}@mongodb:27017/whatsapp-transcriber?authSource=admin

# Redis
REDIS_PASSWORD=$(openssl rand -hex 24)
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# JWT
JWT_SECRET=$(openssl rand -hex 64)

# SSL
SSL_EMAIL=your@email.com

# Whisper
WHISPER_MODEL=medium

# Limits
MAX_FILE_SIZE=50mb
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
EOL
    echo -e "${RED}Veuillez configurer le fichier .env avec vos paramètres${NC}"
    exit 1
fi

# Installation de certbot si nécessaire
if [ ! -f /usr/local/bin/certbot ]; then
    echo "Installation de Certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot
fi

# Démarrage des conteneurs
echo "Démarrage des conteneurs..."
docker-compose -f docker-compose.yml down
docker-compose -f docker-compose.yml up -d

# Configuration initiale de SSL
echo "Configuration SSL..."
domain=$(grep DOMAIN .env | cut -d '=' -f2)
email=$(grep SSL_EMAIL .env | cut -d '=' -f2)

sudo certbot certonly --standalone \
    -d $domain \
    --email $email \
    --agree-tos \
    --no-eff-email \
    --staging  # Retirer --staging en production

# Redémarrage de Nginx
echo "Redémarrage de Nginx..."
docker-compose restart nginx

echo -e "${GREEN}Déploiement terminé !${NC}"
echo -e "Vérifiez les logs avec: docker-compose logs -f"
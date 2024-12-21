# WhatsApp Voice Note Transcriber 🎤✍️

Une application web permettant de transcrire automatiquement les messages vocaux WhatsApp en texte en utilisant l'IA Whisper d'OpenAI.

## Fonctionnalités 🚀

- 📱 **Connexion WhatsApp** via QR Code
- 🎵 **Transcription automatique** des messages vocaux
- 🔒 **Sécurité renforcée** avec chiffrement des données
- 👥 **Multi-utilisateurs** avec comptes personnalisés
- 🌐 **Interface web responsive**
- ⚡ **Traitement asynchrone** avec système de file d'attente
- 🔄 **Mise à jour en temps réel**
- 📊 **Historique des transcriptions**

## Prérequis 📋

- Docker et Docker Compose
- Node.js 18+
- Python 3.8+
- FFmpeg
- MongoDB
- Redis

## Installation 🛠️

1. **Cloner le dépôt**
```bash
git clone https://github.com/votre-compte/whatsapp-transcriber.git
cd whatsapp-transcriber
```

2. **Configuration de l'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos paramètres
```

3. **Lancement avec Docker**
```bash
# Développement
docker-compose -f docker-compose.dev.yml up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## Configuration ⚙️

Variables d'environnement principales :

```env
NODE_ENV=production
PORT=3000
DOMAIN=your-domain.com

# MongoDB
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=your_password
MONGODB_URI=mongodb://admin:password@mongodb:27017/whatsapp-transcriber?authSource=admin

# Redis
REDIS_PASSWORD=your_redis_password
REDIS_URL=redis://:password@redis:6379

# Whisper
WHISPER_MODEL=large-v3  # ou base/small/medium selon vos ressources
```

## Architecture 🏗️

```
whatsapp-transcriber/
├── frontend/              # Application React
├── src/                   # Backend Node.js
│   ├── config/           # Configuration
│   ├── models/           # Modèles MongoDB
│   ├── routes/           # Routes API
│   ├── services/         # Services métier
│   └── middlewares/      # Middlewares
├── docker/               # Configurations Docker
├── nginx/                # Configuration Nginx
└── scripts/              # Scripts utilitaires
```

## API Documentation 📚

### Routes principales

```
POST /api/auth/register   # Inscription
POST /api/auth/login      # Connexion
GET  /api/transcripts     # Liste des transcriptions
GET  /api/whatsapp-qr     # QR Code WhatsApp
```

Documentation complète disponible dans `/docs/api.md`

## Sécurité 🔒

- Authentification JWT
- Chiffrement des données sensibles
- Rate limiting
- Protection CORS
- Validation des entrées
- Sessions WhatsApp chiffrées

## Performance 🚄

- Mise en cache avec Redis
- File d'attente avec Bull
- Optimisation des transcriptions Whisper
- Compression des réponses
- Minification des assets

## Déploiement 🚀

### Oracle Cloud (Free Tier)

```bash
# Configuration SSL avec Let's Encrypt
./scripts/setup-ssl.sh

# Déploiement
./scripts/deploy.sh
```

Ressources recommandées :
- VM.Standard.E2.1.Micro (1 OCPU, 1GB RAM)
- Block Storage 50GB

## Développement 💻

```bash
# Installation des dépendances
npm install

# Mode développement
npm run dev

# Tests
npm test

# Linting
npm run lint
```

## Contribution 🤝

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](CONTRIBUTING.md) pour les directives.

## Problèmes connus 🐛

- La transcription nécessite une puissance CPU importante
- Certains formats audio peuvent nécessiter une conversion
- Limites de l'API WhatsApp Web

## Licence 📄

MIT License - voir [LICENSE.md](LICENSE.md)

## Support 💬

- Créer une issue GitHub
- Documentation : `/docs`
- Email : support@votredomaine.com

## Auteurs 👥

- [Votre Nom](https://github.com/votre-compte)

## Remerciements 🙏

- [OpenAI Whisper](https://github.com/openai/whisper)
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- La communauté open source
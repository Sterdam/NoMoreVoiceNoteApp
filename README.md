# VoxKill - Professional Voice Note Transcription Platform 🎤✍️

VoxKill est une plateforme SaaS professionnelle de transcription automatique de messages vocaux WhatsApp utilisant l'API OpenAI Whisper. Conçue pour les professionnels et entreprises qui veulent éliminer les messages vocaux de leur workflow.

## Fonctionnalités 🚀

### Core Features
- 📱 **Connexion WhatsApp** via QR Code avec reconnexion automatique
- 🎵 **Transcription automatique** des messages vocaux avec OpenAI Whisper
- 📄 **Résumés intelligents** générés par IA
- 🔒 **Sécurité avancée** avec chiffrement AES-256 et sessions Redis
- 👥 **Multi-utilisateurs** avec système d'abonnements
- 💳 **Monétisation intégrée** avec Stripe

### Performance & Scalabilité
- ⚡ **Queue de traitement** avec Bull et Redis pour haute performance
- 🔄 **Sessions persistantes** et reconnexion automatique WhatsApp
- 📊 **Dashboard analytique** avec métriques en temps réel
- 🌐 **API RESTful** complète et documentée
- 🚀 **Optimisations avancées** compression, cache, rate limiting

### Plans d'abonnement
- **Free**: 10 transcriptions/mois
- **Basic**: 100 transcriptions/mois + résumés
- **Premium**: 1000 transcriptions/mois + priorité
- **Enterprise**: Illimité + support dédié

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
git clone https://github.com/votre-compte/voxkill.git
cd voxkill
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
FRONTEND_URL=https://your-domain.com

# MongoDB
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=your_secure_password
MONGODB_URI=mongodb://admin:password@mongodb:27017/voxkill?authSource=admin

# Redis
REDIS_PASSWORD=your_redis_password
REDIS_URL=redis://:password@redis:6379

# Security
JWT_SECRET=your-jwt-secret-min-32-chars
COOKIE_SECRET=your-cookie-secret-min-32-chars
CRYPTO_KEY=your-crypto-key-min-64-chars
CSRF_SECRET=your-csrf-secret-min-32-chars

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
STRIPE_BASIC_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx
```

## Architecture 🏗️

```
voxkill/
├── frontend/              # Application React (Vite + TailwindCSS)
│   ├── src/
│   │   ├── pages/        # Pages de l'application
│   │   ├── components/   # Composants réutilisables
│   │   ├── contexts/     # Contextes React (Auth, etc.)
│   │   └── utils/        # Utilitaires frontend
├── src/                   # Backend Node.js
│   ├── config/           # Configuration (DB, Redis, etc.)
│   ├── models/           # Modèles MongoDB
│   │   ├── User.js       # Utilisateurs et auth
│   │   ├── Transcript.js # Transcriptions
│   │   ├── Subscription.js # Abonnements
│   │   └── Usage.js      # Statistiques d'usage
│   ├── routes/           # Routes API
│   ├── services/         # Services métier
│   │   ├── WhatsAppService.js  # Gestion WhatsApp
│   │   ├── QueueService.js     # File d'attente Bull
│   │   ├── OpenAIService.js    # Intégration OpenAI
│   │   └── PaymentService.js   # Intégration Stripe
│   ├── middlewares/      # Middlewares
│   └── utils/            # Utilitaires
│       └── performanceOptimizer.js # Optimisations
├── docker/               # Configurations Docker
├── nginx/                # Configuration Nginx
└── scripts/              # Scripts de déploiement
```

## API Documentation 📚

### Routes principales

```
# Authentication
POST /api/auth/register   # Inscription
POST /api/auth/login      # Connexion
POST /api/auth/logout     # Déconnexion
GET  /api/auth/verify     # Vérification token

# Transcriptions
GET  /api/transcripts     # Liste des transcriptions (paginée)
GET  /api/transcripts/:id # Détail d'une transcription
POST /api/transcripts/transcribe # Nouvelle transcription
DELETE /api/transcripts/:id # Supprimer une transcription
GET  /api/transcripts/job/:jobId # Statut d'un job

# WhatsApp
GET  /api/transcripts/whatsapp-qr # QR Code WhatsApp
GET  /api/transcripts/whatsapp-status # Statut connexion

# Payments
POST /api/payment/create-checkout-session # Créer session paiement
POST /api/payment/webhook # Webhook Stripe
GET  /api/payment/subscription # Abonnement actuel

# User
GET  /api/users/profile   # Profil utilisateur
PUT  /api/users/settings  # Modifier paramètres
GET  /api/users/usage     # Statistiques d'usage
```

Documentation complète disponible dans `/docs/api.md`

## Sécurité 🔒

### Authentification & Autorisation
- JWT avec refresh tokens
- Sessions sécurisées avec httpOnly cookies
- Protection CSRF double-submit
- 2FA optionnel (TOTP)

### Chiffrement & Protection
- Chiffrement AES-256-GCM pour données sensibles
- TLS 1.3 pour toutes les communications
- Hachage bcrypt pour mots de passe
- Clés API chiffrées en base

### Sécurité applicative
- Rate limiting par utilisateur et IP
- Validation stricte des entrées (Joi)
- Protection XSS avec CSP
- Headers de sécurité (Helmet.js)
- Audit logs pour actions sensibles

## Performance & Optimisations 🚄

### Architecture haute performance
- **Queue de traitement** Bull avec workers parallèles
- **Cache multi-niveaux** Redis + CDN
- **Sessions persistantes** WhatsApp avec reconnexion auto
- **Compression Gzip** pour toutes les réponses
- **Connection pooling** MongoDB et Redis

### Optimisations spécifiques
- Transcriptions prioritaires pour utilisateurs Premium
- Lazy loading et code splitting côté frontend
- Pagination et filtrage côté serveur
- Garbage collection optimisé pour Node.js
- Monitoring des performances en temps réel

## Déploiement 🚀

### Production (Jelastic Cloud)

```bash
# Déploiement automatique via manifest
jps deploy manifest.jps
```

### Oracle Cloud Infrastructure

```bash
# Configuration SSL avec Let's Encrypt
./scripts/setup-ssl.sh

# Déploiement Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

Ressources recommandées :
- **Développement**: VM.Standard.E2.1.Micro (1 OCPU, 1GB RAM)
- **Production**: VM.Standard.A1.Flex (2 OCPU, 12GB RAM)
- **Storage**: Block Storage 100GB pour les sessions WhatsApp

### Configuration PM2 (Production)

```bash
# Installation globale
npm install -g pm2

# Démarrage avec configuration optimisée
pm2 start ecosystem.config.js

# Monitoring
pm2 monit
```

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

## Monitoring & Maintenance 📊

### Métriques disponibles
- Nombre de transcriptions par utilisateur
- Temps de traitement moyen
- Taux d'erreur et retry
- Utilisation mémoire et CPU
- Statut des connexions WhatsApp

### Endpoints de santé
- `/health` - Santé générale
- `/api/transcripts/queue/metrics` - Métriques de la queue (admin)

## Contribution 🤝

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](CONTRIBUTING.md) pour les directives.

## Limitations connues 🐛

- WhatsApp Web nécessite une connexion téléphone active
- Limite de 25MB par fichier audio
- Formats supportés: OGG, MP3, WAV, M4A
- Reconnexion manuelle requise après 14 jours d'inactivité

## Licence 📄

MIT License - voir [LICENSE.md](LICENSE.md)

## Support 💬

- Créer une issue GitHub
- Documentation : `/docs`
- Email : support@votredomaine.com

## Auteurs 👥

- [Votre Nom](https://github.com/votre-compte)

## Stack Technique 🛠️

### Backend
- Node.js 18+ avec Express.js
- MongoDB avec Mongoose ODM
- Redis pour cache et sessions
- Bull pour queue de jobs
- OpenAI API (Whisper + GPT)
- Stripe pour paiements

### Frontend
- React 18 avec Vite
- TailwindCSS pour styling
- React Router pour navigation
- Axios pour API calls
- Context API pour state management

### Infrastructure
- Docker & Docker Compose
- Nginx reverse proxy
- PM2 process manager
- Let's Encrypt SSL

## Remerciements 🙏

- [OpenAI API](https://platform.openai.com/)
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- [Bull Queue](https://github.com/OptimalBits/bull)
- La communauté open source
# 🚀 VoxKill - Guide de Démarrage Développement

## Prérequis

- Node.js 18+ 
- MongoDB 6+
- Redis (optionnel)
- FFmpeg
- Clé API OpenAI

## Installation Rapide

### 1. Cloner et installer les dépendances

```bash
git clone <repository>
cd NoMoreVoiceNoteApp
npm install
cd frontend && npm install && cd ..
```

### 2. Configuration de l'environnement

```bash
cp .env.example .env
```

**Variables OBLIGATOIRES à configurer :**

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/voxkill_dev

# OpenAI (REQUIS pour la transcription)
OPENAI_API_KEY=sk-votre-clef-api-openai

# JWT Secret
JWT_SECRET=votre-secret-jwt-securise

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 3. Démarrer MongoDB

```bash
# Avec Docker
docker run -d -p 27017:27017 --name mongodb mongo:6

# Ou avec installation locale
mongod
```

### 4. Créer les dossiers nécessaires

```bash
mkdir -p data/sessions data/temp logs
```

### 5. Démarrer les services

**Terminal 1 - Backend :**
```bash
npm run dev
```

**Terminal 2 - Frontend :**
```bash
cd frontend
npm run dev
```

## 🎯 Test Rapide

1. Aller sur http://localhost:5173
2. Créer un compte
3. Aller dans Dashboard → WhatsApp
4. Scanner le QR code avec WhatsApp
5. Envoyer une note vocale à n'importe qui
6. Voir la transcription arriver !

## 📋 Fonctionnalités Disponibles

### ✅ Fonctionnel
- ✅ Inscription/Connexion utilisateur
- ✅ Connexion WhatsApp (QR code)
- ✅ Transcription audio (OpenAI Whisper)
- ✅ Résumés intelligents (GPT)
- ✅ Gestion des quotas par plan
- ✅ Notifications email
- ✅ Interface Dashboard complète
- ✅ Support multilingue (FR/EN)

### 🔧 Configuration Optionnelle
- 📧 Emails (Gmail recommandé)
- 📊 Redis (cache/performance)
- 💳 Stripe (paiements - désactivé en dev)

## 🛠️ Développement

### Structure du projet

```
src/
├── models/          # Modèles MongoDB
├── services/        # Services métier
├── routes/          # Routes API
├── middlewares/     # Middlewares Express
├── config/          # Configuration
└── utils/           # Utilitaires

frontend/src/
├── pages/           # Pages React
├── components/      # Composants réutilisables
├── hooks/           # Hooks personnalisés
└── stores/          # État global
```

### Scripts utiles

```bash
# Développement avec rechargement auto
npm run dev

# Tests (si configurés)
npm test

# Linter
npm run lint

# Build frontend
cd frontend && npm run build
```

### Debugging

**Logs détaillés :**
```env
LOG_LEVEL=debug
VERBOSE_LOGGING=true
```

**Mock services (économiser les tokens) :**
```env
MOCK_OPENAI=true
MOCK_WHATSAPP=true
```

## 🔍 Résolution de Problèmes

### WhatsApp ne se connecte pas
- Vérifier que les dossiers `data/sessions` existent
- Supprimer `data/sessions/*` et rescanner le QR

### Transcription échoue
- Vérifier la clé OpenAI API
- Vérifier FFmpeg installé : `ffmpeg -version`
- Logs dans console pour détails erreur

### Base de données
- Vérifier MongoDB running : `mongo --eval "db.runCommand('ping')"`
- Vérifier l'URI dans .env

### Frontend ne charge pas
- Vérifier les ports (3000 backend, 5173 frontend)
- `cd frontend && npm install` si problèmes de dépendances

## 📞 Support

**Logs importants :**
```bash
# Backend
tail -f logs/app.log

# Frontend 
Ctrl+Shift+I → Console
```

**Base de données :**
```bash
# Connexion MongoDB
mongo voxkill_dev

# Voir les utilisateurs
db.users.find()

# Voir les transcriptions
db.transcripts.find()
```

## 🚀 Mise en Production

Voir `DEPLOYMENT.md` pour les instructions de déploiement.

---

**Note :** Ce setup est optimisé pour le développement. En production, utilisez des secrets sécurisés, HTTPS, et des bases de données distantes.
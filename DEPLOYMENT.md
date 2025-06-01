# Guide de Déploiement VoxKill

## Prérequis

- Docker et Docker Compose installés
- Nom de domaine configuré (ex: voxkill.com)
- Serveur VPS avec minimum 2GB RAM
- Comptes Stripe et OpenAI configurés

## 1. Configuration initiale

### Cloner le repository
```bash
git clone https://github.com/your-username/voxkill.git
cd voxkill
```

### Configurer les variables d'environnement
```bash
cp .env.production .env
# Éditer .env avec vos valeurs réelles
nano .env
```

### Variables importantes à configurer :
- `MONGODB_URI` : Générer un mot de passe sécurisé
- `REDIS_URL` : Générer un mot de passe sécurisé
- `JWT_SECRET` : Utiliser `openssl rand -base64 64`
- `COOKIE_SECRET` : Utiliser `openssl rand -base64 32`
- `CRYPTO_KEY` : Utiliser `openssl rand -base64 32`
- `CSRF_SECRET` : Utiliser `openssl rand -base64 32`
- `OPENAI_API_KEY` : Depuis dashboard.openai.com
- `STRIPE_SECRET_KEY` : Depuis dashboard.stripe.com

## 2. Configuration Stripe

### Exécuter le script de configuration
```bash
npm run setup:stripe
```

Ce script va créer :
- Les produits et prix Stripe
- La configuration du portail client
- Le webhook endpoint

### Mettre à jour .env avec les IDs générés
```
STRIPE_BASIC_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## 3. Build et déploiement

### Build des images Docker
```bash
docker-compose -f docker-compose.prod.yml build
```

### Démarrer l'application
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Vérifier les logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

## 4. Configuration SSL

### Méthode automatique avec Certbot
```bash
./scripts/setup-ssl.sh voxkill.com
```

### Méthode manuelle
```bash
docker-compose -f docker-compose.prod.yml exec certbot certbot certonly \
  --webroot -w /var/www/certbot \
  -d voxkill.com -d www.voxkill.com \
  --email admin@voxkill.com \
  --agree-tos \
  --no-eff-email
```

## 5. Vérifications post-déploiement

### Health check
```bash
curl https://voxkill.com/api/health
```

### Vérifier les services
```bash
docker-compose -f docker-compose.prod.yml ps
```

### Tester la connexion WhatsApp
1. Aller sur https://voxkill.com
2. Créer un compte
3. Scanner le QR code WhatsApp

## 6. Maintenance

### Backup de la base de données
```bash
docker-compose -f docker-compose.prod.yml exec mongodb mongodump \
  --db voxkill --out /backup/$(date +%Y%m%d_%H%M%S)
```

### Mise à jour de l'application
```bash
git pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Monitoring des logs
```bash
# Logs application
docker-compose -f docker-compose.prod.yml logs -f app

# Logs Nginx
docker-compose -f docker-compose.prod.yml logs -f nginx

# Tous les logs
docker-compose -f docker-compose.prod.yml logs -f
```

## 7. Scaling

### Augmenter les workers de queue
Modifier dans `.env` :
```
QUEUE_CONCURRENCY=10
QUEUE_PRIORITY_CONCURRENCY=20
```

### Augmenter les ressources Docker
Modifier dans `docker-compose.prod.yml` les limites CPU/mémoire

### Multi-instances
Pour déployer sur plusieurs serveurs, utiliser Docker Swarm ou Kubernetes

## 8. Troubleshooting

### WhatsApp ne se connecte pas
```bash
# Vérifier les sessions
docker-compose -f docker-compose.prod.yml exec app ls -la whatsapp-sessions/

# Redémarrer le service
docker-compose -f docker-compose.prod.yml restart app
```

### Erreurs de paiement
```bash
# Vérifier les webhooks Stripe
docker-compose -f docker-compose.prod.yml logs app | grep webhook

# Tester manuellement
curl -X POST https://voxkill.com/api/payment/webhook \
  -H "Stripe-Signature: test" \
  -d '{}'
```

### Performance lente
```bash
# Vérifier l'utilisation des ressources
docker stats

# Vérifier Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli info

# Vérifier MongoDB
docker-compose -f docker-compose.prod.yml exec mongodb mongosh --eval "db.stats()"
```

## 9. Sécurité

### Firewall recommandé
```bash
# Autoriser seulement les ports nécessaires
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

### Rotation des secrets
Tous les 3 mois, régénérer :
- JWT_SECRET
- COOKIE_SECRET
- CRYPTO_KEY
- CSRF_SECRET

### Mises à jour de sécurité
```bash
# Mettre à jour les images Docker
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Support

Pour toute question ou problème :
- Email : support@voxkill.com
- Documentation : https://docs.voxkill.com
class AdService {
    constructor() {
        this.ads = {
            fr: [
                // Ads basées sur les bénéfices
                {
                    text: "💎 Passez à VoxKill Pro et recevez vos transcriptions dans une conversation privée !",
                    cta: "Essai gratuit 7 jours →",
                    url: "voxkill.com/pro",
                    type: "feature"
                },
                {
                    text: "🚀 Débloquez les résumés intelligents et gagnez 90% de temps sur vos messages vocaux",
                    cta: "Découvrir Pro →",
                    url: "voxkill.com/upgrade",
                    type: "benefit"
                },
                {
                    text: "✨ 100h de transcription + Résumés détaillés + Conversation privée = 9.99€/mois",
                    cta: "Commencer l'essai →",
                    url: "voxkill.com/trial",
                    type: "pricing"
                },
                {
                    text: "🎯 Les pros économisent 2h/semaine avec VoxKill Pro. Et vous ?",
                    cta: "Rejoindre les pros →",
                    url: "voxkill.com/pro",
                    type: "social"
                },
                {
                    text: "📊 Saviez-vous ? Nos utilisateurs Pro transcrivent 5x plus de messages",
                    cta: "Passer à Pro →",
                    url: "voxkill.com/stats",
                    type: "stats"
                },
                {
                    text: "🎁 Offre limitée : -20% sur l'abonnement annuel Pro !",
                    cta: "Profiter de l'offre →",
                    url: "voxkill.com/promo",
                    type: "promo"
                },
                {
                    text: "💬 Fatiqué de voir vos transcriptions dans les conversations ? Passez à Pro !",
                    cta: "Conversation privée →",
                    url: "voxkill.com/private",
                    type: "pain"
                },
                {
                    text: "⚡ Transcription prioritaire + Support 24/7 avec VoxKill Pro",
                    cta: "Upgrader maintenant →",
                    url: "voxkill.com/support",
                    type: "support"
                }
            ],
            en: [
                {
                    text: "💎 Upgrade to VoxKill Pro and get your transcriptions in a private chat!",
                    cta: "7-day free trial →",
                    url: "voxkill.com/pro",
                    type: "feature"
                },
                {
                    text: "🚀 Unlock smart summaries and save 90% of time on voice messages",
                    cta: "Discover Pro →",
                    url: "voxkill.com/upgrade",
                    type: "benefit"
                },
                {
                    text: "✨ 100h transcription + Detailed summaries + Private chat = $9.99/month",
                    cta: "Start trial →",
                    url: "voxkill.com/trial",
                    type: "pricing"
                },
                {
                    text: "🎯 Pros save 2h/week with VoxKill Pro. What about you?",
                    cta: "Join the pros →",
                    url: "voxkill.com/pro",
                    type: "social"
                },
                {
                    text: "📊 Did you know? Our Pro users transcribe 5x more messages",
                    cta: "Go Pro →",
                    url: "voxkill.com/stats",
                    type: "stats"
                },
                {
                    text: "🎁 Limited offer: -20% on annual Pro subscription!",
                    cta: "Get the offer →",
                    url: "voxkill.com/promo",
                    type: "promo"
                },
                {
                    text: "💬 Tired of seeing transcriptions in your chats? Go Pro!",
                    cta: "Private conversation →",
                    url: "voxkill.com/private",
                    type: "pain"
                },
                {
                    text: "⚡ Priority transcription + 24/7 support with VoxKill Pro",
                    cta: "Upgrade now →",
                    url: "voxkill.com/support",
                    type: "support"
                }
            ]
        };
        
        // Messages spéciaux selon le contexte
        this.contextualAds = {
            highUsage: {
                fr: {
                    text: "📈 Vous approchez de votre limite ! Passez à Pro pour des transcriptions illimitées",
                    cta: "Augmenter ma limite →",
                    url: "voxkill.com/unlimited"
                },
                en: {
                    text: "📈 You're approaching your limit! Go Pro for unlimited transcriptions",
                    cta: "Increase my limit →",
                    url: "voxkill.com/unlimited"
                }
            },
            longMessage: {
                fr: {
                    text: "🎙️ Messages longs ? Pro permet jusqu'à 30 min de transcription !",
                    cta: "Débloquer 30 min →",
                    url: "voxkill.com/long"
                },
                en: {
                    text: "🎙️ Long messages? Pro allows up to 30 min transcription!",
                    cta: "Unlock 30 min →",
                    url: "voxkill.com/long"
                }
            },
            weekend: {
                fr: {
                    text: "🌟 Offre week-end : Essayez Pro gratuitement jusqu'à lundi !",
                    cta: "Activer l'essai →",
                    url: "voxkill.com/weekend"
                },
                en: {
                    text: "🌟 Weekend offer: Try Pro free until Monday!",
                    cta: "Activate trial →",
                    url: "voxkill.com/weekend"
                }
            }
        };
        
        // Tracker pour éviter de répéter les mêmes pubs
        this.lastShownAds = new Map();
    }

    getRandomAd(language = 'fr', context = {}) {
        const lang = this.ads[language] ? language : 'fr';
        let adPool = [...this.ads[lang]];
        
        // Ajouter des pubs contextuelles si applicable
        if (context.usagePercent > 80) {
            adPool.push(this.contextualAds.highUsage[lang]);
        }
        
        if (context.messageDuration > 180) { // Plus de 3 minutes
            adPool.push(this.contextualAds.longMessage[lang]);
        }
        
        const dayOfWeek = new Date().getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
            adPool.push(this.contextualAds.weekend[lang]);
        }
        
        // Éviter de montrer la même pub deux fois de suite
        const userId = context.userId || 'default';
        const lastAdIndex = this.lastShownAds.get(userId);
        
        if (lastAdIndex !== undefined && adPool.length > 1) {
            adPool = adPool.filter((_, index) => index !== lastAdIndex);
        }
        
        // Sélection aléatoire
        const selectedIndex = Math.floor(Math.random() * adPool.length);
        const selectedAd = adPool[selectedIndex];
        
        // Mémoriser l'index pour éviter la répétition
        this.lastShownAds.set(userId, selectedIndex);
        
        // Nettoyer la mémoire si trop d'entrées
        if (this.lastShownAds.size > 1000) {
            const firstKey = this.lastShownAds.keys().next().value;
            this.lastShownAds.delete(firstKey);
        }
        
        return selectedAd;
    }

    formatAdForWhatsApp(ad) {
        return `\n━━━━━━━━━━━━━━━━━━━━━━\n${ad.text}\n\n👉 ${ad.cta}\n🔗 ${ad.url}`;
    }

    shouldShowAd(subscription) {
        // Pas de pub pour les plans payants
        return subscription.plan === 'trial' || subscription.plan === 'free';
    }
    
    // Méthode pour obtenir une pub spécifique selon le type
    getAdByType(type, language = 'fr') {
        const lang = this.ads[language] ? language : 'fr';
        const ad = this.ads[lang].find(a => a.type === type);
        return ad || this.getRandomAd(language);
    }
    
    // Méthode pour créer une pub personnalisée
    createCustomAd(data) {
        const { remainingDays, usagePercent, language = 'fr' } = data;
        
        if (remainingDays <= 3 && remainingDays > 0) {
            return {
                text: language === 'fr' 
                    ? `⏰ Plus que ${remainingDays} jours d'essai ! Gardez vos avantages avec Pro`
                    : `⏰ Only ${remainingDays} days left! Keep your benefits with Pro`,
                cta: language === 'fr' ? "Continuer avec Pro →" : "Continue with Pro →",
                url: "voxkill.com/continue"
            };
        }
        
        if (usagePercent >= 90) {
            return {
                text: language === 'fr'
                    ? "🔴 Limite presque atteinte ! Passez à Pro pour continuer sans interruption"
                    : "🔴 Almost at limit! Go Pro to continue without interruption",
                cta: language === 'fr' ? "Éviter l'interruption →" : "Avoid interruption →",
                url: "voxkill.com/nolimit"
            };
        }
        
        return this.getRandomAd(language);
    }
    
    // Méthode pour tracker les clics (à implémenter avec analytics)
    trackAdClick(adType, userId) {
        // Ici, vous pourriez envoyer des données à votre système d'analytics
        const LogService = require('./LogService');
        LogService.info('Ad clicked', {
            adType,
            userId,
            timestamp: new Date()
        });
    }
    
    // Messages de bienvenue pour les nouveaux utilisateurs
    getWelcomeMessage(language = 'fr') {
        const messages = {
            fr: `🎉 **Bienvenue sur VoxKill !**

Votre essai gratuit inclut :
✅ 10 transcriptions
✅ Messages jusqu'à 3 minutes
✅ Français et anglais

💡 *Astuce : Envoyez-moi une note vocale pour commencer !*`,

            en: `🎉 **Welcome to VoxKill!**

Your free trial includes:
✅ 10 transcriptions
✅ Messages up to 3 minutes
✅ French and English

💡 *Tip: Send me a voice note to get started!*`
        };
        
        return messages[language] || messages.fr;
    }
}

module.exports = new AdService();
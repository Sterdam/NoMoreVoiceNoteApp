class AdService {
    constructor() {
        this.ads = {
            fr: [
                {
                    text: "💎 Passez à VoxKill Pro pour des résumés détaillés et sans publicité !",
                    cta: "Découvrir Pro →",
                    url: "https://voxkill.com/upgrade"
                },
                {
                    text: "🚀 Transcrivez jusqu'à 100h/mois avec VoxKill Pro",
                    cta: "Essai gratuit 7 jours →",
                    url: "https://voxkill.com/trial"
                },
                {
                    text: "✨ VoxKill Pro : Résumés intelligents et export PDF",
                    cta: "En savoir plus →",
                    url: "https://voxkill.com/features"
                }
            ],
            en: [
                {
                    text: "💎 Upgrade to VoxKill Pro for detailed summaries without ads!",
                    cta: "Discover Pro →",
                    url: "https://voxkill.com/upgrade"
                },
                {
                    text: "🚀 Transcribe up to 100h/month with VoxKill Pro",
                    cta: "7-day free trial →",
                    url: "https://voxkill.com/trial"
                },
                {
                    text: "✨ VoxKill Pro: Smart summaries and PDF export",
                    cta: "Learn more →",
                    url: "https://voxkill.com/features"
                }
            ]
        };
    }

    getRandomAd(language = 'fr') {
        const lang = this.ads[language] ? language : 'fr';
        const adList = this.ads[lang];
        return adList[Math.floor(Math.random() * adList.length)];
    }

    formatAdForWhatsApp(ad) {
        return `\n\n━━━━━━━━━━━━━━━\n${ad.text}\n👉 ${ad.cta} ${ad.url}`;
    }

    shouldShowAd(subscription) {
        // Pas de pub pour les plans payants
        return subscription.plan === 'trial' || subscription.plan === 'free';
    }
}

module.exports = new AdService();
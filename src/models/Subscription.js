const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    plan: {
        type: String,
        enum: ['trial', 'basic', 'pro', 'enterprise'],
        default: 'trial'
    },
    status: {
        type: String,
        enum: ['active', 'cancelled', 'expired', 'past_due'],
        default: 'active'
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    trialStartDate: {
        type: Date,
        default: Date.now
    },
    trialEndDate: {
        type: Date,
        default: function() {
            return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours
        }
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: {
        type: Boolean,
        default: false
    },
    limits: {
        minutesPerMonth: {
            type: Number,
            default: 30
        },
        summariesPerMonth: {
            type: Number,
            default: 50
        },
        maxAudioDuration: {
            type: Number,
            default: 300 // 5 minutes en secondes
        }
    },
    features: {
        transcription: {
            type: Boolean,
            default: true
        },
        summary: {
            type: Boolean,
            default: true
        },
        multiLanguage: {
            type: Boolean,
            default: false
        },
        priority: {
            type: Boolean,
            default: false
        },
        apiAccess: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true
});

// Plans avec calcul de rentabilité
subscriptionSchema.statics.PLANS = {
    trial: {
        name: 'Essai Gratuit',
        price: 0,
        duration: 7,
        limits: {
            minutesPerMonth: 30, // 30 minutes pour l'essai gratuit (10 messages de ~3 min)
            summariesPerMonth: 0, // Pas de résumés en trial
            maxAudioDuration: 180 // 3 minutes max par message
        },
        features: {
            transcription: true,
            summary: false, // Pas de résumé en trial
            multiLanguage: false, // Seulement FR et EN
            priority: false,
            apiAccess: false,
            separateConversation: false // Pas de conversation séparée en trial
        }
    },
    basic: {
        name: 'Basic',
        price: 9.99,
        stripePriceId: process.env.STRIPE_BASIC_PRICE_ID,
        limits: {
            minutesPerMonth: 300, // 5 heures
            summariesPerMonth: 300,
            maxAudioDuration: 600 // 10 minutes
        },
        features: {
            transcription: true,
            summary: true,
            multiLanguage: true,
            priority: false,
            apiAccess: false,
            separateConversation: true // Conversation séparée disponible
        },
        // Coût estimé: 300 min * 0.006$ = 1.80$ + résumés ~0.60$ = 2.40$
        // Marge: 9.99$ - 2.40$ = 7.59$ (76% de marge)
    },
    pro: {
        name: 'Pro',
        price: 19.99, // Prix ajusté pour meilleure proposition de valeur
        stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
        limits: {
            minutesPerMonth: 1200, // 20 heures
            summariesPerMonth: 1200,
            maxAudioDuration: 1800 // 30 minutes
        },
        features: {
            transcription: true,
            summary: true,
            multiLanguage: true,
            priority: true,
            apiAccess: false,
            separateConversation: true
        },
        // Coût estimé: 1200 min * 0.006$ = 7.20$ + résumés ~2.40$ = 9.60$
        // Marge: 19.99$ - 9.60$ = 10.39$ (52% de marge)
    },
    enterprise: {
        name: 'Enterprise',
        price: 49.99, // Prix ajusté pour être plus attractif
        stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
        limits: {
            minutesPerMonth: 6000, // 100 heures
            summariesPerMonth: 6000,
            maxAudioDuration: 3600 // 60 minutes
        },
        features: {
            transcription: true,
            summary: true,
            multiLanguage: true,
            priority: true,
            apiAccess: true,
            separateConversation: true
        },
        // Coût estimé: 6000 min * 0.006$ = 36$ + résumés ~12$ = 48$
        // Marge: 49.99$ - 48$ = 1.99$ (4% de marge mais volume)
    }
};


// Méthodes d'instance
subscriptionSchema.methods.isActive = function() {
    if (this.status !== 'active') return false;
    
    if (this.plan === 'trial') {
        return new Date() < this.trialEndDate;
    }
    
    return this.currentPeriodEnd && new Date() < this.currentPeriodEnd;
};

subscriptionSchema.methods.canUseFeature = function(feature) {
    return this.isActive() && this.features[feature] === true;
};

subscriptionSchema.methods.getRemainingTrial = function() {
    if (this.plan !== 'trial') return 0;
    const remaining = this.trialEndDate - new Date();
    return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
};

subscriptionSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.stripeCustomerId;
    delete obj.stripeSubscriptionId;
    return obj;
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
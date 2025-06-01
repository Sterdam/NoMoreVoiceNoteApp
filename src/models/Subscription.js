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
            default: 30 // 30 minutes pour l'essai gratuit
        },
        summariesPerMonth: {
            type: Number,
            default: 50
        },
        maxAudioDuration: {
            type: Number,
            default: 300 // 5 minutes max par audio
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

// Plans disponibles
subscriptionSchema.statics.PLANS = {
    trial: {
        name: 'Essai Gratuit',
        price: 0,
        duration: 7, // jours
        limits: {
            minutesPerMonth: 30,
            summariesPerMonth: 50,
            maxAudioDuration: 300
        },
        features: {
            transcription: true,
            summary: true,
            multiLanguage: false,
            priority: false,
            apiAccess: false
        }
    },
    basic: {
        name: 'Basic',
        price: 9.99,
        stripePriceId: process.env.STRIPE_BASIC_PRICE_ID,
        limits: {
            minutesPerMonth: 300, // 5 heures
            summariesPerMonth: 500,
            maxAudioDuration: 600 // 10 minutes
        },
        features: {
            transcription: true,
            summary: true,
            multiLanguage: true,
            priority: false,
            apiAccess: false
        }
    },
    pro: {
        name: 'Pro',
        price: 29.99,
        stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
        limits: {
            minutesPerMonth: 1200, // 20 heures
            summariesPerMonth: 2000,
            maxAudioDuration: 1800 // 30 minutes
        },
        features: {
            transcription: true,
            summary: true,
            multiLanguage: true,
            priority: true,
            apiAccess: false
        }
    },
    enterprise: {
        name: 'Enterprise',
        price: 99.99,
        stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
        limits: {
            minutesPerMonth: 6000, // 100 heures
            summariesPerMonth: 10000,
            maxAudioDuration: 3600 // 60 minutes
        },
        features: {
            transcription: true,
            summary: true,
            multiLanguage: true,
            priority: true,
            apiAccess: true
        }
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
    return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24))); // jours
};

subscriptionSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.stripeCustomerId;
    delete obj.stripeSubscriptionId;
    return obj;
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
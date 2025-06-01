const mongoose = require('mongoose');

const usageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
        required: true
    },
    month: {
        type: String,
        required: true // Format: YYYY-MM
    },
    transcriptions: {
        count: {
            type: Number,
            default: 0
        },
        totalMinutes: {
            type: Number,
            default: 0
        },
        totalCost: {
            type: Number,
            default: 0
        }
    },
    summaries: {
        count: {
            type: Number,
            default: 0
        },
        totalCost: {
            type: Number,
            default: 0
        }
    },
    totalCost: {
        type: Number,
        default: 0
    },
    details: [{
        date: {
            type: Date,
            default: Date.now
        },
        type: {
            type: String,
            enum: ['transcription', 'summary'],
            required: true
        },
        duration: Number, // en secondes pour les transcriptions
        cost: Number,
        transcriptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Transcript'
        }
    }]
}, {
    timestamps: true
});

// Index composé unique pour userId + month
usageSchema.index({ userId: 1, month: 1 }, { unique: true });
usageSchema.index({ subscriptionId: 1, month: 1 });

// Méthodes statiques
usageSchema.statics.getCurrentMonth = function() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

usageSchema.statics.getOrCreate = async function(userId, subscriptionId) {
    const month = this.getCurrentMonth();
    
    let usage = await this.findOne({ userId, month });
    
    if (!usage) {
        usage = await this.create({
            userId,
            subscriptionId,
            month
        });
    }
    
    return usage;
};

// Méthodes d'instance
usageSchema.methods.addTranscription = async function(minutes, cost, transcriptId) {
    this.transcriptions.count += 1;
    this.transcriptions.totalMinutes += minutes;
    this.transcriptions.totalCost += cost;
    this.totalCost += cost;
    
    this.details.push({
        type: 'transcription',
        duration: minutes * 60,
        cost,
        transcriptId
    });
    
    return this.save();
};

usageSchema.methods.addSummary = async function(cost, transcriptId) {
    this.summaries.count += 1;
    this.summaries.totalCost += cost;
    this.totalCost += cost;
    
    this.details.push({
        type: 'summary',
        cost,
        transcriptId
    });
    
    return this.save();
};

usageSchema.methods.getRemainingMinutes = async function() {
    const subscription = await mongoose.model('Subscription').findById(this.subscriptionId);
    if (!subscription) return 0;
    
    const limit = subscription.limits.minutesPerMonth;
    return Math.max(0, limit - this.transcriptions.totalMinutes);
};

usageSchema.methods.getRemainingSummaries = async function() {
    const subscription = await mongoose.model('Subscription').findById(this.subscriptionId);
    if (!subscription) return 0;
    
    const limit = subscription.limits.summariesPerMonth;
    return Math.max(0, limit - this.summaries.count);
};

usageSchema.methods.canTranscribe = async function(durationMinutes) {
    const remaining = await this.getRemainingMinutes();
    return remaining >= durationMinutes;
};

usageSchema.methods.canSummarize = async function() {
    const remaining = await this.getRemainingSummaries();
    return remaining > 0;
};

const Usage = mongoose.model('Usage', usageSchema);
module.exports = Usage;
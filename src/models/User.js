const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    whatsappNumber: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    settings: {
        transcriptionLanguage: {
            type: String,
            enum: ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'ja', 'ko', 'zh'],
            default: 'fr'
        },
        autoTranscribe: {
            type: Boolean,
            default: true
        },
        autoSummarize: {
            type: Boolean,
            default: true
        },
        summaryLanguage: {
            type: String,
            enum: ['same', 'fr', 'en', 'es', 'de', 'it', 'pt'],
            default: 'same' // 'same' signifie utiliser la même langue que la transcription
        },
        notificationPreferences: {
            email: {
                type: Boolean,
                default: true
            },
            whatsapp: {
                type: Boolean,
                default: true
            },
            usageAlerts: {
                type: Boolean,
                default: true
            }
        },
        timezone: {
            type: String,
            default: 'Europe/Paris'
        }
    },
    encryptionKey: String,
    lastLogin: Date,
    apiKey: {
        type: String,
        unique: true,
        sparse: true
    },
    onboardingCompleted: {
        type: Boolean,
        default: false
    },
    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Méthodes d'instance (définies avant le hook pre-save)
userSchema.methods = {
    generateAuthToken() {
        return jwt.sign(
            { 
                id: this._id, 
                email: this.email, 
                role: this.role 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
    },

    async comparePassword(password) {
        return bcrypt.compare(password, this.password);
    },
    
    generateReferralCode() {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    },
    
    generateApiKey() {
        return `sk_${crypto.randomBytes(24).toString('hex')}`;
    },
    
    async regenerateApiKey() {
        this.apiKey = this.generateApiKey();
        await this.save();
        return this.apiKey;
    },
    
    getLanguageName(code) {
        const languages = {
            'fr': 'Français',
            'en': 'English',
            'es': 'Español',
            'de': 'Deutsch',
            'it': 'Italiano',
            'pt': 'Português',
            'nl': 'Nederlands',
            'pl': 'Polski',
            'ru': 'Русский',
            'ja': '日本語',
            'ko': '한국어',
            'zh': '中文'
        };
        return languages[code] || code;
    }
};

userSchema.statics = {
    async findByCredentials(email, password) {
        const user = await this.findOne({ email, isActive: true });
        if (!user) {
            throw new Error('Invalid credentials');
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }
        return user;
    },
    
    async findByApiKey(apiKey) {
        return this.findOne({ apiKey, isActive: true });
    },
    
    async findByReferralCode(referralCode) {
        return this.findOne({ referralCode: referralCode.toUpperCase() });
    }
};

userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user.encryptionKey;
    return user;
};

// Hook pre-save simplifié pour tester
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);
    }
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
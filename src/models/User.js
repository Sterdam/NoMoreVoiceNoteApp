const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email requis'],
        trim: true,
        lowercase: true,
        unique: true,
        index: true
    },
    password: {
        type: String,
        required: [true, 'Mot de passe requis'],
        minlength: 8
    },
    whatsappNumber: {
        type: String,
        required: [true, 'Numéro WhatsApp requis'],
        unique: true,
        index: true
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
            enum: ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'ja', 'ko', 'zh', 'auto'],
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
            default: 'same'
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
    encryptionKey: {
        type: String,
        required: true
    },
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
    },
    // Legal compliance fields
    termsAcceptedVersion: String,
    termsAcceptedDate: Date,
    termsAcceptedIP: String,
    termsAcceptedUserAgent: String,
    privacyAcceptedVersion: String,
    privacyAcceptedDate: Date,
    privacyAcceptedIP: String,
    privacyAcceptedUserAgent: String
}, {
    timestamps: true
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ whatsappNumber: 1 }, { unique: true });
userSchema.index({ apiKey: 1 }, { sparse: true });
userSchema.index({ referralCode: 1 }, { sparse: true });

// Instance methods
userSchema.methods.generateAuthToken = function() {
    return jwt.sign(
        { 
            id: this._id, 
            email: this.email, 
            role: this.role 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
    );
};

userSchema.methods.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password);
};

userSchema.methods.generateReferralCode = function() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
};

userSchema.methods.generateApiKey = function() {
    return `sk_${crypto.randomBytes(24).toString('hex')}`;
};

userSchema.methods.regenerateApiKey = async function() {
    this.apiKey = this.generateApiKey();
    await this.save();
    return this.apiKey;
};

userSchema.methods.getLanguageName = function(code) {
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
        'zh': '中文',
        'auto': 'Automatique'
    };
    return languages[code] || code;
};

userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user.encryptionKey;
    delete user.__v;
    return user;
};

// Static methods
userSchema.statics.findByCredentials = async function(email, password) {
    const user = await this.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
        throw new Error('Invalid credentials');
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }
    return user;
};

userSchema.statics.findByApiKey = async function(apiKey) {
    return this.findOne({ apiKey, isActive: true });
};

userSchema.statics.findByReferralCode = async function(referralCode) {
    return this.findOne({ referralCode: referralCode.toUpperCase() });
};

// Pre-save hook
userSchema.pre('save', async function(next) {
    const user = this;
    
    // Hash password if modified
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 12);
    }
    
    // Generate encryption key if not present
    if (!user.encryptionKey) {
        user.encryptionKey = crypto.randomBytes(32).toString('hex');
    }
    
    // Generate referral code if not present
    if (!user.referralCode) {
        user.referralCode = user.generateReferralCode();
    }
    
    next();
});

// Ensure we don't create duplicate model
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
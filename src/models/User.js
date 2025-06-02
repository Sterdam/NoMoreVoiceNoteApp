const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email requis'],
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(email) {
                return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
            },
            message: 'Format d\'email invalide'
        }
    },
    password: {
        type: String,
        required: [true, 'Mot de passe requis'],
        minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères']
    },
    whatsappNumber: {
        type: String,
        required: [true, 'Numéro WhatsApp requis'],
        unique: true,
        validate: {
            validator: function(phone) {
                return /^\+[1-9]\d{1,14}$/.test(phone);
            },
            message: 'Format de numéro WhatsApp invalide'
        }
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
        summaryLevel: {
            type: String,
            enum: ['none', 'concise', 'detailed'],
            default: 'concise',
            description: 'none: pas de résumé, concise: résumé court (2-3 phrases), detailed: résumé détaillé (5-7 phrases)'
        },
        summaryLanguage: {
            type: String,
            enum: ['same', 'fr', 'en', 'es', 'de', 'it', 'pt'],
            default: 'same'
        },
        separateConversation: {
            type: Boolean,
            default: false,
            description: 'Pour les comptes payants : envoyer les transcriptions dans une conversation séparée'
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
        type: String
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

// Instance methods
userSchema.methods.generateAuthToken = function() {
    const payload = {
        id: this._id.toString(),
        email: this.email,
        role: this.role
    };
    
    return jwt.sign(
        payload,
        process.env.JWT_SECRET || 'default-secret-key',
        { expiresIn: '24h' }
    );
};

userSchema.methods.comparePassword = async function(password) {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        return false;
    }
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
    const user = await this.findOne({ 
        email: email.toLowerCase(), 
        isActive: true 
    });
    
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

// Pre-save middleware
userSchema.pre('save', async function(next) {
    try {
        // Hash password if modified
        if (this.isModified('password')) {
            const saltRounds = 12;
            this.password = await bcrypt.hash(this.password, saltRounds);
        }
        
        // Generate encryption key if not present
        if (!this.encryptionKey) {
            this.encryptionKey = crypto.randomBytes(32).toString('hex');
        }
        
        // Generate referral code if not present
        if (!this.referralCode) {
            this.referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

// Error handling middleware
userSchema.post('save', function(error, _doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        if (field === 'email') {
            next(new Error('Cette adresse email est déjà utilisée'));
        } else if (field === 'whatsappNumber') {
            next(new Error('Ce numéro WhatsApp est déjà utilisé'));
        } else {
            next(new Error('Une valeur unique est déjà utilisée'));
        }
    } else {
        next(error);
    }
});

// Create model
const User = mongoose.model('User', userSchema);

module.exports = User;
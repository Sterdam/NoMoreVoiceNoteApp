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
        defaultLanguage: {
            type: String,
            default: 'fr'
        },
        autoTranscribe: {
            type: Boolean,
            default: true
        },
        notificationPreferences: {
            email: {
                type: Boolean,
                default: true
            },
            whatsapp: {
                type: Boolean,
                default: true
            }
        }
    },
    encryptionKey: String,
    lastLogin: Date,
}, {
    timestamps: true
});

// Retirer les index du schéma car ils sont gérés par dbInit.js
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);
    }
    if (!this.encryptionKey) {
        this.encryptionKey = crypto.randomBytes(32).toString('hex');
    }
    next();
});

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
    }
};

userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user.encryptionKey;
    return user;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
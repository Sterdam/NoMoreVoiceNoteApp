// src/middlewares/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LogService = require('../services/LogService');

const auth = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new Error('Authentication required');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findOne({ 
            _id: decoded.id,
            isActive: true 
        });

        if (!user) {
            throw new Error('User not found or inactive');
        }

        user.lastLogin = new Date();
        await user.save();

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        LogService.warn('Authentication failed:', { error: error.message });
        res.status(401).json({ error: 'Please authenticate.' });
    }
};

const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (roles.length && !roles.includes(req.user.role)) {
            LogService.warn('Authorization failed:', { 
                userId: req.user._id,
                requiredRoles: roles,
                userRole: req.user.role 
            });
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};

module.exports = { auth, authorize };
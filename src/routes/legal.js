// src/routes/legal.js - Simplified
const express = require('express');
const router = express.Router();

// Simple endpoints that return basic info
router.get('/terms', (req, res) => {
    res.json({
        title: "Terms of Service",
        version: "1.0",
        url: "https://voxkill.com/terms"
    });
});

router.get('/privacy', (req, res) => {
    res.json({
        title: "Privacy Policy", 
        version: "1.0",
        url: "https://voxkill.com/privacy"
    });
});

module.exports = router;
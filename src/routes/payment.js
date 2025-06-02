const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const PaymentService = require('../services/PaymentService');
const Subscription = require('../models/Subscription');
const Usage = require('../models/Usage');
const LogService = require('../services/LogService');
const { t } = require('../utils/translate');

// Obtenir l'abonnement actuel
router.get('/subscription', auth, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({ userId: req.user._id });
        
        if (!subscription) {
            // Créer un essai gratuit automatiquement
            const newSubscription = new Subscription({
                userId: req.user._id,
                plan: 'trial',
                status: 'active'
            });
            await newSubscription.save();
            return res.json(newSubscription);
        }
        
        // Ajouter les infos d'utilisation
        const usage = await Usage.getOrCreate(req.user._id, subscription._id);
        const remainingMinutes = await usage.getRemainingMinutes();
        const remainingSummaries = await usage.getRemainingSummaries();
        
        res.json({
            subscription,
            usage: {
                remainingMinutes,
                remainingSummaries,
                transcriptionsCount: usage.transcriptions.count,
                summariesCount: usage.summaries.count
            },
            plans: Subscription.PLANS
        });
    } catch (error) {
        LogService.error('Error fetching subscription:', error);
        res.status(500).json({ error: t('payment.subscription.fetch_error', req) });
    }
});

// Créer une session de checkout
router.post('/create-checkout-session', auth, async (req, res) => {
    try {
        const { planId } = req.body;
        
        if (!planId || !Subscription.PLANS[planId] || planId === 'trial') {
            return res.status(400).json({ error: t('payment.checkout.invalid_plan', req) });
        }
        
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const host = req.get('host');
        
        const session = await PaymentService.createCheckoutSession(
            req.user._id,
            planId,
            `${protocol}://${host}/dashboard?payment=success`,
            `${protocol}://${host}/dashboard?payment=cancelled`
        );
        
        res.json({ url: session.url });
    } catch (error) {
        LogService.error('Error creating checkout session:', error);
        res.status(500).json({ error: t('payment.checkout.session_creation_error', req) });
    }
});

// Créer une session du portail client
router.post('/create-portal-session', auth, async (req, res) => {
    try {
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const host = req.get('host');
        const returnUrl = `${protocol}://${host}/dashboard`;
        
        const session = await PaymentService.createPortalSession(req.user._id, returnUrl);
        
        res.json({ url: session.url });
    } catch (error) {
        LogService.error('Error creating portal session:', error);
        res.status(500).json({ error: t('payment.portal.session_creation_error', req) });
    }
});

// Webhook Stripe - Note: This endpoint must be excluded from CSRF protection
// It's secured by Stripe's signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    // Verify the request is coming from Stripe
    if (!signature) {
        LogService.warn('Webhook request without signature');
        return res.status(400).json({ error: t('payment.webhook.missing_signature', req) });
    }
    
    try {
        await PaymentService.handleWebhook(req.body, signature);
        res.json({ received: true });
    } catch (error) {
        LogService.error('Webhook error:', error);
        // Always return 2xx to Stripe to prevent retries for invalid signatures
        res.status(200).json({ error: t('payment.webhook.processing_failed', req) });
    }
});

// Annuler l'abonnement
router.post('/cancel-subscription', auth, async (req, res) => {
    try {
        const { immediately } = req.body;
        const subscription = await PaymentService.cancelSubscription(req.user._id, immediately);
        
        res.json({
            message: immediately 
                ? t('payment.subscription.cancelled_immediately', req) 
                : t('payment.subscription.cancelled_end_period', req),
            subscription
        });
    } catch (error) {
        LogService.error('Error cancelling subscription:', error);
        res.status(500).json({ error: t('payment.subscription.cancel_error', req) });
    }
});

// Obtenir l'historique d'utilisation
router.get('/usage-history', auth, async (req, res) => {
    try {
        const { months = 6 } = req.query;
        
        const usageHistory = await Usage.find({ userId: req.user._id })
            .sort({ month: -1 })
            .limit(parseInt(months));
        
        res.json(usageHistory);
    } catch (error) {
        LogService.error('Error fetching usage history:', error);
        res.status(500).json({ error: t('payment.usage.history_fetch_error', req) });
    }
});

module.exports = router;
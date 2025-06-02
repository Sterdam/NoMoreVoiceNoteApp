const Stripe = require('stripe');
const LogService = require('./LogService');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { t } = require('../utils/translate');

class PaymentService {
    constructor() {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    }

    async createCustomer(user) {
        try {
            const customer = await this.stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: user._id.toString()
                }
            });

            return customer;
        } catch (error) {
            LogService.error('Stripe customer creation error:', error);
            throw error;
        }
    }

    async createCheckoutSession(userId, planId, successUrl, cancelUrl, req) {
        try {
            const user = await User.findById(userId);
            const subscription = await Subscription.findOne({ userId });
            const plan = Subscription.PLANS[planId];

            if (!plan || planId === 'trial') {
                throw new Error(t('payment.invalid_plan', req));
            }

            // Créer ou récupérer le client Stripe
            let customerId = subscription?.stripeCustomerId;
            if (!customerId) {
                const customer = await this.createCustomer(user);
                customerId = customer.id;
                
                if (subscription) {
                    subscription.stripeCustomerId = customerId;
                    await subscription.save();
                }
            }

            // Créer la session de paiement
            const session = await this.stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [{
                    price: plan.stripePriceId,
                    quantity: 1
                }],
                mode: 'subscription',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    userId: userId.toString(),
                    planId
                },
                subscription_data: {
                    trial_period_days: subscription?.plan === 'trial' ? 0 : 7,
                    metadata: {
                        userId: userId.toString(),
                        planId
                    }
                },
                allow_promotion_codes: true
            });

            return session;
        } catch (error) {
            LogService.error('Checkout session creation error:', error);
            throw error;
        }
    }

    async createPortalSession(userId, returnUrl, req) {
        try {
            const subscription = await Subscription.findOne({ userId });
            if (!subscription?.stripeCustomerId) {
                throw new Error(t('payment.no_subscription', req));
            }

            const session = await this.stripe.billingPortal.sessions.create({
                customer: subscription.stripeCustomerId,
                return_url: returnUrl
            });

            return session;
        } catch (error) {
            LogService.error('Portal session creation error:', error);
            throw error;
        }
    }

    async handleWebhook(payload, signature) {
        let event;

        try {
            event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                this.webhookSecret
            );
        } catch (error) {
            LogService.error('Webhook signature verification failed:', error);
            throw error;
        }

        // Traiter les événements
        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutComplete(event.data.object);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdate(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await this.handleSubscriptionCancelled(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                await this.handlePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await this.handlePaymentFailed(event.data.object);
                break;

            default:
                LogService.info('Unhandled webhook event:', { type: event.type });
        }
    }

    async handleCheckoutComplete(session) {
        try {
            const { userId, planId } = session.metadata;
            const stripeSubscription = await this.stripe.subscriptions.retrieve(
                session.subscription
            );

            let subscription = await Subscription.findOne({ userId });
            
            if (!subscription) {
                subscription = new Subscription({ userId });
            }

            const plan = Subscription.PLANS[planId];

            subscription.plan = planId;
            subscription.status = 'active';
            subscription.stripeCustomerId = session.customer;
            subscription.stripeSubscriptionId = session.subscription;
            subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
            subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
            subscription.limits = plan.limits;
            subscription.features = plan.features;

            await subscription.save();

            LogService.info('Subscription activated:', { userId, planId });
        } catch (error) {
            LogService.error('Error handling checkout complete:', error);
            throw error;
        }
    }

    async handleSubscriptionUpdate(stripeSubscription) {
        try {
            const subscription = await Subscription.findOne({
                stripeSubscriptionId: stripeSubscription.id
            });

            if (!subscription) {
                LogService.warn('Subscription not found for update:', {
                    stripeSubscriptionId: stripeSubscription.id
                });
                return;
            }

            subscription.status = this.mapStripeStatus(stripeSubscription.status);
            subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
            subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
            subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;

            await subscription.save();

            LogService.info('Subscription updated:', {
                subscriptionId: subscription._id,
                status: subscription.status
            });
        } catch (error) {
            LogService.error('Error handling subscription update:', error);
            throw error;
        }
    }

    async handleSubscriptionCancelled(stripeSubscription) {
        try {
            const subscription = await Subscription.findOne({
                stripeSubscriptionId: stripeSubscription.id
            });

            if (!subscription) return;

            subscription.status = 'cancelled';
            await subscription.save();

            LogService.info('Subscription cancelled:', {
                subscriptionId: subscription._id
            });
        } catch (error) {
            LogService.error('Error handling subscription cancellation:', error);
            throw error;
        }
    }

    async handlePaymentSucceeded(invoice) {
        LogService.info('Payment succeeded:', {
            invoiceId: invoice.id,
            amount: invoice.amount_paid / 100
        });
    }

    async handlePaymentFailed(invoice) {
        try {
            const subscription = await Subscription.findOne({
                stripeCustomerId: invoice.customer
            });

            if (subscription) {
                subscription.status = 'past_due';
                await subscription.save();
            }

            LogService.warn('Payment failed:', {
                invoiceId: invoice.id,
                customerId: invoice.customer
            });
        } catch (error) {
            LogService.error('Error handling payment failure:', error);
        }
    }

    mapStripeStatus(stripeStatus) {
        const statusMap = {
            'active': 'active',
            'past_due': 'past_due',
            'canceled': 'cancelled',
            'unpaid': 'past_due',
            'incomplete': 'past_due',
            'incomplete_expired': 'expired',
            'trialing': 'active'
        };

        return statusMap[stripeStatus] || 'expired';
    }

    async cancelSubscription(userId, immediately = false, req) {
        try {
            const subscription = await Subscription.findOne({ userId });
            
            if (!subscription?.stripeSubscriptionId) {
                throw new Error(t('payment.no_active_subscription', req));
            }

            await this.stripe.subscriptions.update(
                subscription.stripeSubscriptionId,
                {
                    cancel_at_period_end: !immediately
                }
            );

            if (immediately) {
                await this.stripe.subscriptions.del(subscription.stripeSubscriptionId);
                subscription.status = 'cancelled';
            } else {
                subscription.cancelAtPeriodEnd = true;
            }

            await subscription.save();

            return subscription;
        } catch (error) {
            LogService.error('Error cancelling subscription:', error);
            throw error;
        }
    }
}

module.exports = new PaymentService();
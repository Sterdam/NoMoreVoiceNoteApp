require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function setupStripeProducts() {
    try {
        console.log('🚀 Configuration des produits Stripe...');

        // Créer le produit principal
        const product = await stripe.products.create({
            name: 'VoxKill',
            description: 'Service de transcription WhatsApp avec IA',
            metadata: {
                service: 'voxkill'
            }
        });

        console.log('✅ Produit créé:', product.id);

        // Créer les prix pour chaque plan
        const plans = [
            {
                nickname: 'Basic',
                unit_amount: 999, // 9.99€
                currency: 'eur',
                recurring: { interval: 'month' },
                metadata: { plan: 'basic' }
            },
            {
                nickname: 'Pro',
                unit_amount: 2999, // 29.99€
                currency: 'eur',
                recurring: { interval: 'month' },
                metadata: { plan: 'pro' }
            },
            {
                nickname: 'Enterprise',
                unit_amount: 9999, // 99.99€
                currency: 'eur',
                recurring: { interval: 'month' },
                metadata: { plan: 'enterprise' }
            }
        ];

        const prices = {};
        for (const plan of plans) {
            const price = await stripe.prices.create({
                product: product.id,
                ...plan
            });
            prices[plan.metadata.plan] = price.id;
            console.log(`✅ Prix ${plan.nickname} créé:`, price.id);
        }

        // Créer le webhook endpoint
        const webhook = await stripe.webhookEndpoints.create({
            url: `${process.env.FRONTEND_URL}/api/payment/webhook`,
            enabled_events: [
                'checkout.session.completed',
                'customer.subscription.created',
                'customer.subscription.updated',
                'customer.subscription.deleted',
                'invoice.payment_succeeded',
                'invoice.payment_failed'
            ]
        });

        console.log('✅ Webhook créé:', webhook.url);
        console.log('⚠️  Webhook secret:', webhook.secret);

        // Configuration du portail client
        const portalConfig = await stripe.billingPortal.configurations.create({
            business_profile: {
                headline: 'Gérez votre abonnement VoxKill',
                privacy_policy_url: `${process.env.FRONTEND_URL}/privacy`,
                terms_of_service_url: `${process.env.FRONTEND_URL}/terms`
            },
            features: {
                invoice_history: { enabled: true },
                payment_method_update: { enabled: true },
                subscription_cancel: { enabled: true },
                subscription_update: {
                    enabled: true,
                    default_allowed_updates: ['price'],
                    products: [{ product: product.id, prices: Object.values(prices) }]
                }
            }
        });

        console.log('✅ Portail client configuré');

        // Afficher les variables d'environnement à ajouter
        console.log('\n📋 Ajoutez ces variables à votre .env:\n');
        console.log(`STRIPE_BASIC_PRICE_ID=${prices.basic}`);
        console.log(`STRIPE_PRO_PRICE_ID=${prices.pro}`);
        console.log(`STRIPE_ENTERPRISE_PRICE_ID=${prices.enterprise}`);
        console.log(`STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
        console.log(`STRIPE_PORTAL_CONFIG_ID=${portalConfig.id}`);

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
}

setupStripeProducts();
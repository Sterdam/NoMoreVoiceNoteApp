#!/usr/bin/env node
require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function setupStripeProducts() {
    try {
        console.log('🚀 Configuration des produits Stripe...');

        // Créer le produit principal
        const product = await stripe.products.create({
            name: 'VoxKill',
            description: 'Service de transcription automatique des messages vocaux WhatsApp',
            metadata: {
                service: 'whatsapp-transcriber'
            }
        });

        console.log('✅ Produit créé:', product.id);

        // Créer les prix pour chaque plan
        const plans = {
            basic: {
                amount: 999, // 9.99€ en centimes
                nickname: 'Plan Basic',
                metadata: {
                    minutesPerMonth: '300',
                    summariesPerMonth: '500'
                }
            },
            pro: {
                amount: 2999, // 29.99€
                nickname: 'Plan Pro',
                metadata: {
                    minutesPerMonth: '1200',
                    summariesPerMonth: '2000'
                }
            },
            enterprise: {
                amount: 9999, // 99.99€
                nickname: 'Plan Enterprise',
                metadata: {
                    minutesPerMonth: '6000',
                    summariesPerMonth: '10000'
                }
            }
        };

        console.log('\n📋 Création des prix...\n');

        for (const [key, plan] of Object.entries(plans)) {
            const price = await stripe.prices.create({
                product: product.id,
                unit_amount: plan.amount,
                currency: 'eur',
                recurring: {
                    interval: 'month'
                },
                nickname: plan.nickname,
                metadata: plan.metadata
            });

            console.log(`✅ ${plan.nickname}: ${price.id}`);
            console.log(`   Ajoutez à votre .env: STRIPE_${key.toUpperCase()}_PRICE_ID=${price.id}`);
        }

        // Configuration du portail client
        const portalConfig = await stripe.billingPortal.configurations.create({
            business_profile: {
                headline: 'Gérez votre abonnement VoxKill'
            },
            features: {
                invoice_history: {
                    enabled: true
                },
                payment_method_update: {
                    enabled: true
                },
                subscription_cancel: {
                    enabled: true,
                    mode: 'at_period_end',
                    cancellation_reason: {
                        enabled: true,
                        options: [
                            'too_expensive',
                            'missing_features',
                            'switched_service',
                            'unused',
                            'other'
                        ]
                    }
                },
                subscription_pause: {
                    enabled: false
                },
                subscription_update: {
                    enabled: true,
                    default_allowed_updates: ['price'],
                    proration_behavior: 'create_prorations'
                }
            }
        });

        console.log('\n✅ Configuration du portail client créée');
        console.log(`   ID: ${portalConfig.id}`);

        // Créer le webhook endpoint
        const webhookEndpoint = await stripe.webhookEndpoints.create({
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

        console.log('\n✅ Webhook endpoint créé');
        console.log(`   URL: ${webhookEndpoint.url}`);
        console.log(`   Secret: ${webhookEndpoint.secret}`);
        console.log(`   Ajoutez à votre .env: STRIPE_WEBHOOK_SECRET=${webhookEndpoint.secret}`);

        console.log('\n🎉 Configuration Stripe terminée avec succès !');
        console.log('\n⚠️  N\'oubliez pas de mettre à jour votre fichier .env avec les IDs ci-dessus.');

    } catch (error) {
        console.error('\n❌ Erreur lors de la configuration:', error.message);
        process.exit(1);
    }
}

// Vérifier que la clé API est définie
if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY non définie dans le fichier .env');
    process.exit(1);
}

// Lancer la configuration
setupStripeProducts();
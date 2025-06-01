#!/usr/bin/env node

/**
 * Script pour créer les produits et prix Stripe
 * À exécuter une seule fois pour configurer les plans d'abonnement
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function setupStripeProducts() {
    try {
        console.log('🚀 Configuration des produits Stripe...\n');

        // Créer le produit principal
        const product = await stripe.products.create({
            name: 'VoxKill',
            description: 'Service de transcription et résumé automatique pour WhatsApp',
            metadata: {
                app: 'whatsapp-transcriber'
            }
        });

        console.log('✅ Produit créé:', product.id);

        // Créer les prix pour chaque plan
        const plans = [
            {
                name: 'Basic',
                unit_amount: 999, // 9.99€
                metadata: {
                    plan: 'basic',
                    minutes_per_month: '300',
                    summaries_per_month: '500',
                    max_audio_duration: '600'
                }
            },
            {
                name: 'Pro',
                unit_amount: 2999, // 29.99€
                metadata: {
                    plan: 'pro',
                    minutes_per_month: '1200',
                    summaries_per_month: '2000',
                    max_audio_duration: '1800'
                }
            },
            {
                name: 'Enterprise',
                unit_amount: 9999, // 99.99€
                metadata: {
                    plan: 'enterprise',
                    minutes_per_month: '6000',
                    summaries_per_month: '10000',
                    max_audio_duration: '3600'
                }
            }
        ];

        console.log('\nCréation des prix...\n');

        const prices = [];
        for (const plan of plans) {
            const price = await stripe.prices.create({
                product: product.id,
                nickname: plan.name,
                unit_amount: plan.unit_amount,
                currency: 'eur',
                recurring: {
                    interval: 'month'
                },
                metadata: plan.metadata
            });

            prices.push(price);
            console.log(`✅ Prix ${plan.name} créé:`, price.id);
        }

        // Afficher les variables d'environnement à ajouter
        console.log('\n📋 Ajoutez ces lignes à votre fichier .env:\n');
        console.log(`STRIPE_BASIC_PRICE_ID=${prices[0].id}`);
        console.log(`STRIPE_PRO_PRICE_ID=${prices[1].id}`);
        console.log(`STRIPE_ENTERPRISE_PRICE_ID=${prices[2].id}`);

        console.log('\n✨ Configuration Stripe terminée avec succès!');

    } catch (error) {
        console.error('❌ Erreur lors de la configuration Stripe:', error.message);
        process.exit(1);
    }
}

// Vérifier que la clé Stripe est définie
if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY n\'est pas définie dans le fichier .env');
    process.exit(1);
}

// Vérifier qu'on est bien en mode live
if (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    console.log('⚠️  Attention: Vous utilisez une clé de test Stripe');
    console.log('Pour la production, utilisez une clé live (sk_live_...)');
}

setupStripeProducts();
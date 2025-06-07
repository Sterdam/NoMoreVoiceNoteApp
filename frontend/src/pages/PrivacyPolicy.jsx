// frontend/src/pages/PrivacyPolicy.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <Link to="/">
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            
            <div className="flex items-center mb-4">
              <Shield className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Politique de Confidentialité
              </h1>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400">
              Dernière mise à jour : 1er janvier 2024
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
              <p>
                Chez VoxKill, nous accordons une importance primordiale à la protection de vos données personnelles. 
                Cette politique de confidentialité explique comment nous collectons, utilisons, stockons et protégeons 
                vos informations lorsque vous utilisez notre service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Données collectées</h2>
              <h3 className="text-xl font-semibold mb-2">1.1 Données fournies directement</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Adresse email</li>
                <li>Numéro de téléphone WhatsApp</li>
                <li>Informations de paiement (traitées par Stripe)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">1.2 Données collectées automatiquement</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Messages vocaux WhatsApp (temporairement, pour transcription)</li>
                <li>Adresse IP</li>
                <li>Données d'utilisation du service</li>
                <li>Informations sur l'appareil et le navigateur</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Utilisation des données</h2>
              <p>Nous utilisons vos données pour :</p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Fournir le service de transcription</li>
                <li>Gérer votre compte et votre abonnement</li>
                <li>Améliorer nos services</li>
                <li>Communiquer avec vous (mises à jour, support)</li>
                <li>Respecter nos obligations légales</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Stockage et sécurité</h2>
              <h3 className="text-xl font-semibold mb-2">3.1 Sécurité des données</h3>
              <p>
                Nous utilisons des mesures de sécurité de pointe pour protéger vos données :
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Chiffrement SSL/TLS pour toutes les communications</li>
                <li>Chiffrement AES-256 pour le stockage des données</li>
                <li>Authentification à deux facteurs disponible</li>
                <li>Audits de sécurité réguliers</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">3.2 Durée de conservation</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Messages vocaux : supprimés immédiatement après transcription</li>
                <li>Transcriptions : conservées tant que votre compte est actif</li>
                <li>Données de compte : conservées 30 jours après suppression du compte</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Partage des données</h2>
              <p>
                Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos données uniquement avec :
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>OpenAI : pour la transcription (audio uniquement, anonymisé)</li>
                <li>Stripe : pour le traitement des paiements</li>
                <li>Autorités légales : si requis par la loi</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Vos droits (RGPD)</h2>
              <p>
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
                <li><strong>Droit de rectification :</strong> corriger vos données</li>
                <li><strong>Droit à l'effacement :</strong> supprimer vos données</li>
                <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
                <li><strong>Droit de limitation :</strong> limiter le traitement de vos données</li>
              </ul>
              <p className="mt-4">
                Pour exercer ces droits, contactez-nous à privacy@voxkill.com
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Cookies</h2>
              <p>
                Nous utilisons des cookies essentiels pour le fonctionnement du service :
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Cookies de session (authentification)</li>
                <li>Préférences utilisateur (langue, thème)</li>
              </ul>
              <p className="mt-4">
                Nous n'utilisons pas de cookies de tracking ou publicitaires.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Transferts internationaux</h2>
              <p>
                Vos données peuvent être traitées dans des pays hors de l'UE. Dans ce cas, nous nous assurons 
                que des garanties appropriées sont en place (clauses contractuelles types, Privacy Shield, etc.).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Mineurs</h2>
              <p>
                VoxKill n'est pas destiné aux personnes de moins de 16 ans. Nous ne collectons pas 
                sciemment de données personnelles d'enfants.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Modifications</h2>
              <p>
                Nous pouvons mettre à jour cette politique de confidentialité. Toute modification importante 
                vous sera notifiée par email ou via l'application.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Contact</h2>
              <p>
                Pour toute question concernant vos données personnelles :
              </p>
              <ul className="list-none mt-4 space-y-2">
                <li><strong>Email :</strong> privacy@voxkill.com</li>
                <li><strong>DPO :</strong> dpo@voxkill.com</li>
                <li><strong>Adresse :</strong> VoxKill SAS, 123 Avenue des Champs, 75008 Paris, France</li>
              </ul>
              <p className="mt-4">
                Vous pouvez également contacter la CNIL pour toute réclamation.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <p className="text-gray-600 dark:text-gray-400">
                © 2024 VoxKill. Tous droits réservés.
              </p>
              <div className="mt-4 sm:mt-0 flex space-x-4">
                <Link to="/terms" className="text-primary-600 hover:text-primary-700">
                  Conditions d'utilisation
                </Link>
                <Link to="/" className="text-primary-600 hover:text-primary-700">
                  Accueil
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
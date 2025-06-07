// frontend/src/pages/TermsOfService.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';

export default function TermsOfService() {
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
              <FileText className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Conditions Générales d'Utilisation
              </h1>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400">
              Dernière mise à jour : 1er janvier 2024
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Acceptation des conditions</h2>
              <p>
                En accédant et en utilisant VoxKill, vous acceptez d'être lié par ces conditions d'utilisation. 
                Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Description du service</h2>
              <p>
                VoxKill est un service de transcription automatique de messages vocaux WhatsApp. 
                Nous utilisons des technologies d'intelligence artificielle pour convertir vos messages audio en texte.
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Transcription automatique de messages vocaux</li>
                <li>Support multilingue</li>
                <li>Génération de résumés (selon votre plan)</li>
                <li>Intégration sécurisée avec WhatsApp</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Utilisation du service</h2>
              <h3 className="text-xl font-semibold mb-2">3.1 Compte utilisateur</h3>
              <p>
                Vous devez créer un compte pour utiliser VoxKill. Vous êtes responsable de la confidentialité 
                de vos identifiants de connexion et de toutes les activités effectuées sous votre compte.
              </p>
              
              <h3 className="text-xl font-semibold mb-2 mt-4">3.2 Utilisation acceptable</h3>
              <p>Vous vous engagez à ne pas :</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Utiliser le service à des fins illégales</li>
                <li>Transcrire des contenus sans autorisation</li>
                <li>Tenter de contourner les limitations du service</li>
                <li>Partager votre compte avec des tiers</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Confidentialité et sécurité</h2>
              <p>
                Nous prenons la sécurité de vos données très au sérieux. Toutes les communications sont chiffrées 
                et vos messages vocaux sont supprimés après transcription. Consultez notre 
                {' '}<Link to="/privacy" className="text-primary-600 hover:text-primary-700">politique de confidentialité</Link>{' '}
                pour plus de détails.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Tarification et paiement</h2>
              <p>
                VoxKill propose différents plans tarifaires. Les prix sont indiqués en euros et incluent la TVA applicable. 
                Les paiements sont traités de manière sécurisée via Stripe.
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Essai gratuit de 7 jours sans carte bancaire</li>
                <li>Facturation mensuelle</li>
                <li>Annulation possible à tout moment</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Limitation de responsabilité</h2>
              <p>
                VoxKill est fourni "tel quel". Nous ne garantissons pas une précision de transcription de 100% 
                et ne pouvons être tenus responsables des erreurs de transcription ou d'interprétation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Propriété intellectuelle</h2>
              <p>
                Vous conservez tous les droits sur vos messages vocaux et leurs transcriptions. 
                VoxKill ne revendique aucun droit de propriété sur votre contenu.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Résiliation</h2>
              <p>
                Vous pouvez résilier votre compte à tout moment. Nous nous réservons le droit de suspendre 
                ou de résilier votre accès en cas de violation de ces conditions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Modifications des conditions</h2>
              <p>
                Nous pouvons modifier ces conditions à tout moment. Les modifications entreront en vigueur 
                dès leur publication. Votre utilisation continue du service constitue votre acceptation des 
                conditions modifiées.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Contact</h2>
              <p>
                Pour toute question concernant ces conditions d'utilisation, contactez-nous à :
              </p>
              <ul className="list-none mt-4 space-y-2">
                <li>Email : legal@voxkill.com</li>
                <li>Adresse : VoxKill SAS, 123 Avenue des Champs, 75008 Paris, France</li>
              </ul>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <p className="text-gray-600 dark:text-gray-400">
                © 2024 VoxKill. Tous droits réservés.
              </p>
              <div className="mt-4 sm:mt-0 flex space-x-4">
                <Link to="/privacy" className="text-primary-600 hover:text-primary-700">
                  Politique de confidentialité
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
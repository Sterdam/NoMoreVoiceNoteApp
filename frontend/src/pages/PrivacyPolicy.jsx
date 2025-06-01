import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
          Politique de confidentialité
        </h1>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Dernière mise à jour : 1er juin 2025
          </p>

          <h2>1. Collecte des données</h2>
          <p>Nous collectons les informations suivantes :</p>
          <ul>
            <li><strong>Informations de compte :</strong> Email, numéro WhatsApp</li>
            <li><strong>Données de transcription :</strong> Messages vocaux et leurs transcriptions</li>
            <li><strong>Données d'utilisation :</strong> Logs de connexion, statistiques d'utilisation</li>
            <li><strong>Données de paiement :</strong> Traitées par Stripe (nous ne stockons pas vos informations bancaires)</li>
          </ul>

          <h2>2. Utilisation des données</h2>
          <p>Nous utilisons vos données pour :</p>
          <ul>
            <li>Fournir le service de transcription</li>
            <li>Améliorer la qualité du service</li>
            <li>Communiquer avec vous concernant votre compte</li>
            <li>Assurer la sécurité du service</li>
          </ul>

          <h2>3. Stockage et sécurité</h2>
          <p>
            Vos données sont stockées de manière sécurisée avec chiffrement. Les messages vocaux 
            sont supprimés après transcription. Les transcriptions sont conservées pour votre 
            historique mais peuvent être supprimées à tout moment depuis votre tableau de bord.
          </p>

          <h2>4. Partage des données</h2>
          <p>Nous ne vendons jamais vos données personnelles. Nous partageons vos données uniquement avec :</p>
          <ul>
            <li><strong>OpenAI :</strong> Pour la transcription (audio uniquement, temporairement)</li>
            <li><strong>Stripe :</strong> Pour le traitement des paiements</li>
            <li><strong>Autorités :</strong> Si requis par la loi</li>
          </ul>

          <h2>5. Vos droits</h2>
          <p>Vous avez le droit de :</p>
          <ul>
            <li>Accéder à vos données personnelles</li>
            <li>Corriger vos données</li>
            <li>Supprimer votre compte et toutes vos données</li>
            <li>Exporter vos données</li>
            <li>Vous opposer au traitement</li>
          </ul>

          <h2>6. Cookies</h2>
          <p>
            Nous utilisons des cookies essentiels pour le fonctionnement du service (authentification). 
            Ces cookies sont nécessaires et ne peuvent pas être désactivés.
          </p>

          <h2>7. Protection des mineurs</h2>
          <p>
            Notre service n'est pas destiné aux personnes de moins de 16 ans. Nous ne collectons 
            pas sciemment de données de mineurs.
          </p>

          <h2>8. Modifications</h2>
          <p>
            Nous pouvons mettre à jour cette politique de confidentialité. Vous serez informé 
            de tout changement significatif par email.
          </p>

          <h2>9. Contact</h2>
          <p>
            Pour toute question concernant vos données personnelles :<br />
            Email : privacy@voxkill.com<br />
            DPO : dpo@voxkill.com
          </p>

          <h2>10. Base légale</h2>
          <p>
            Le traitement de vos données est basé sur :<br />
            - Votre consentement<br />
            - L'exécution du contrat de service<br />
            - Nos intérêts légitimes (sécurité, amélioration du service)
          </p>
        </div>
      </div>
    </div>
  );
}
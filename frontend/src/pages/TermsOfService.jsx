import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function TermsOfService() {
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
          Conditions d'utilisation
        </h1>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Dernière mise à jour : 1er juin 2025
          </p>

          <h2>1. Acceptation des conditions</h2>
          <p>
            En utilisant VoxKill, vous acceptez ces conditions d'utilisation. 
            Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
          </p>

          <h2>2. Description du service</h2>
          <p>
            VoxKill est un service de transcription automatique de messages vocaux WhatsApp 
            utilisant l'intelligence artificielle. Le service convertit vos messages audio en texte.
          </p>

          <h2>3. Utilisation acceptable</h2>
          <p>Vous vous engagez à :</p>
          <ul>
            <li>Utiliser le service de manière légale et éthique</li>
            <li>Ne pas transcrire de contenu illégal ou protégé par des droits d'auteur sans autorisation</li>
            <li>Respecter la vie privée d'autrui</li>
            <li>Ne pas utiliser le service pour des activités frauduleuses</li>
          </ul>

          <h2>4. Compte utilisateur</h2>
          <p>
            Vous êtes responsable de maintenir la confidentialité de votre compte et mot de passe. 
            Vous acceptez d'être responsable de toutes les activités qui se produisent sous votre compte.
          </p>

          <h2>5. Propriété intellectuelle</h2>
          <p>
            Le contenu que vous transcrivez reste votre propriété. VoxKill n'acquiert aucun droit 
            sur votre contenu. Vous nous accordez uniquement une licence limitée pour traiter vos 
            fichiers audio aux fins de transcription.
          </p>

          <h2>6. Limitation de responsabilité</h2>
          <p>
            VoxKill est fourni "tel quel". Nous ne garantissons pas l'exactitude parfaite des 
            transcriptions. Le service peut contenir des erreurs et nous ne sommes pas responsables 
            des dommages résultant de l'utilisation du service.
          </p>

          <h2>7. Tarification et paiement</h2>
          <p>
            Les prix sont indiqués sur notre site. Les abonnements sont renouvelés automatiquement 
            sauf annulation. Vous pouvez annuler à tout moment depuis votre tableau de bord.
          </p>

          <h2>8. Confidentialité</h2>
          <p>
            Votre utilisation du service est également régie par notre{' '}
            <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
              Politique de confidentialité
            </Link>.
          </p>

          <h2>9. Modifications</h2>
          <p>
            Nous nous réservons le droit de modifier ces conditions à tout moment. 
            Les modifications entrent en vigueur dès leur publication.
          </p>

          <h2>10. Contact</h2>
          <p>
            Pour toute question concernant ces conditions, contactez-nous à : legal@voxkill.com
          </p>
        </div>
      </div>
    </div>
  );
}
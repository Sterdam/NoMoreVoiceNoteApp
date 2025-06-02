import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';

export default function TermsOfService() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
          {t('terms.title')}
        </h1>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('terms.lastUpdate')}
          </p>

          <h2>{t('terms.acceptance.title')}</h2>
          <p>
            {t('terms.acceptance.description')}
          </p>

          <h2>{t('terms.serviceDescription.title')}</h2>
          <p>
            {t('terms.serviceDescription.description')}
          </p>

          <h2>{t('terms.acceptableUse.title')}</h2>
          <p>{t('terms.acceptableUse.intro')}</p>
          <ul>
            {['legalUse', 'copyright', 'privacy', 'noFraud'].map((item) => (
              <li key={item}>{t(`terms.acceptableUse.items.${item}`)}</li>
            ))}
          </ul>

          <h2>{t('terms.userAccount.title')}</h2>
          <p>
            {t('terms.userAccount.description')}
          </p>

          <h2>{t('terms.intellectualProperty.title')}</h2>
          <p>
            {t('terms.intellectualProperty.description')}
          </p>

          <h2>{t('terms.liability.title')}</h2>
          <p>
            {t('terms.liability.description')}
          </p>

          <h2>{t('terms.pricing.title')}</h2>
          <p>
            {t('terms.pricing.description')}
          </p>

          <h2>{t('terms.privacy.title')}</h2>
          <p>
            {t('terms.privacy.description')}{' '}
            <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
              {t('terms.privacy.linkText')}
            </Link>.
          </p>

          <h2>{t('terms.modifications.title')}</h2>
          <p>
            {t('terms.modifications.description')}
          </p>

          <h2>{t('terms.contact.title')}</h2>
          <p>
            {t('terms.contact.description')}
          </p>
        </div>
      </div>
    </div>
  );
}
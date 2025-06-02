import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicy() {
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
          {t('privacy.title')}
        </h1>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('privacy.lastUpdate')}
          </p>

          <h2>{t('privacy.dataCollection.title')}</h2>
          <p>{t('privacy.dataCollection.intro')}</p>
          <ul>
            {['accountInfo', 'transcriptionData', 'usageData', 'paymentData'].map((item) => (
              <li key={item}>
                <strong>{t(`privacy.dataCollection.items.${item}.label`)}</strong> {t(`privacy.dataCollection.items.${item}.description`)}
              </li>
            ))}
          </ul>

          <h2>{t('privacy.dataUsage.title')}</h2>
          <p>{t('privacy.dataUsage.intro')}</p>
          <ul>
            {['provideService', 'improveQuality', 'communicate', 'ensureSecurity'].map((item) => (
              <li key={item}>{t(`privacy.dataUsage.items.${item}`)}</li>
            ))}
          </ul>

          <h2>{t('privacy.storage.title')}</h2>
          <p>
            {t('privacy.storage.description')}
          </p>

          <h2>{t('privacy.dataSharing.title')}</h2>
          <p>{t('privacy.dataSharing.intro')}</p>
          <ul>
            {['openai', 'stripe', 'authorities'].map((item) => (
              <li key={item}>
                <strong>{t(`privacy.dataSharing.items.${item}.label`)}</strong> {t(`privacy.dataSharing.items.${item}.description`)}
              </li>
            ))}
          </ul>

          <h2>{t('privacy.rights.title')}</h2>
          <p>{t('privacy.rights.intro')}</p>
          <ul>
            {['access', 'correct', 'delete', 'export', 'oppose'].map((item) => (
              <li key={item}>{t(`privacy.rights.items.${item}`)}</li>
            ))}
          </ul>

          <h2>{t('privacy.cookies.title')}</h2>
          <p>
            {t('privacy.cookies.description')}
          </p>

          <h2>{t('privacy.minors.title')}</h2>
          <p>
            {t('privacy.minors.description')}
          </p>

          <h2>{t('privacy.modifications.title')}</h2>
          <p>
            {t('privacy.modifications.description')}
          </p>

          <h2>{t('privacy.contact.title')}</h2>
          <p>
            {t('privacy.contact.intro')}<br />
            {t('privacy.contact.email')}<br />
            {t('privacy.contact.dpo')}
          </p>

          <h2>{t('privacy.legalBasis.title')}</h2>
          <p>
            {t('privacy.legalBasis.intro')}<br />
            {['consent', 'contract', 'legitimateInterests'].map((item) => (
              <span key={item}>- {t(`privacy.legalBasis.items.${item}`)}<br /></span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
}
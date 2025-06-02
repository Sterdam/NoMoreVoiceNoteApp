import toast from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const toastStyles = {
  success: {
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    className: 'bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700',
  },
  error: {
    icon: <XCircle className="w-5 h-5 text-red-600" />,
    className: 'bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700',
  },
  warning: {
    icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
    className: 'bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700',
  },
  info: {
    icon: <Info className="w-5 h-5 text-blue-600" />,
    className: 'bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700',
  },
};

export const useToast = () => {
  const { t: translate } = useTranslation();
  
  const showToast = (message, type = 'info') => {
    const style = toastStyles[type] || toastStyles.info;
    
    toast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full ${style.className} pointer-events-auto flex ring-1 ring-black ring-opacity-5 rounded-lg p-4`}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">{style.icon}</div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">{translate('common.close')}</span>
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    ));
  };

  return {
    success: (message) => showToast(message, 'success'),
    error: (message) => showToast(message, 'error'),
    warning: (message) => showToast(message, 'warning'),
    info: (message) => showToast(message, 'info'),
  };
};
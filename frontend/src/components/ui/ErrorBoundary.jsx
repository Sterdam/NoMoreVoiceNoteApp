import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

// HOC pour utiliser useTranslation avec un composant de classe
function withTranslation(Component) {
  return function WrappedComponent(props) {
    const { t } = useTranslation();
    return <Component {...props} t={t} />;
  };
}

class ErrorBoundaryBase extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6"
          >
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            
            <h2 className="text-xl font-semibold text-center mb-2 text-gray-900 dark:text-white">
              Oops! Une erreur s'est produite
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              {this.props.fallbackMessage || "Quelque chose s'est mal passé. Veuillez rafraîchir la page."}
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs mb-4 overflow-auto">
                {this.state.error.toString()}
              </pre>
            )}
            
            <div className="flex gap-3">
              <Button
                onClick={() => window.location.reload()}
                className="flex-1"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Rafraîchir
              </Button>
              
              <Button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1"
              >
                Réessayer
              </Button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation(ErrorBoundaryBase);

export function ErrorFallback({ error, resetErrorBoundary }) {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t('errors.occurred')}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error?.message || t('errors.unknown')}</p>
        <Button onClick={resetErrorBoundary} size="sm">
          {t('errors.retry')}
        </Button>
      </motion.div>
    </div>
  );
}
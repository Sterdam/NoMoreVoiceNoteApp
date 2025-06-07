// frontend/src/components/PrivateRoute.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuthStore } from '../stores/useStore';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { auth } from '../utils/api';

function PrivateRoute({ children }) {
  const location = useLocation();
  const { user: contextUser, loading: contextLoading } = useAuth();
  const { user: storeUser, isAuthenticated, login: storeLogin } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      // If we have user in context or store, we're good
      if (contextUser || storeUser) {
        setIsChecking(false);
        return;
      }

      // Otherwise, check with the server
      try {
        const response = await auth.status();
        if (response.success && response.user) {
          // Update store with user data
          storeLogin(response.user, 'token-from-cookie');
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
      } finally {
        setIsChecking(false);
      }
    };

    verifyAuth();
  }, [contextUser, storeUser, storeLogin]);

  // Show loading while checking auth
  if (contextLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  const isAuth = !!(contextUser || storeUser || isAuthenticated);

  if (!isAuth) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default PrivateRoute;
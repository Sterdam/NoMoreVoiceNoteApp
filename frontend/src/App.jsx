// frontend/src/App.jsx
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import PrivateRoute from './components/PrivateRoute';
import { useAuthStore } from './stores/useStore';
import { auth } from './utils/api';

// Lazy load pages for better performance
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement...</p>
    </div>
  </div>
);

// Auth guard component
function AuthGuard({ children }) {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const { login: storeLogin, logout } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have a token in cookies
        const response = await auth.status();
        if (response.success && response.user) {
          // Update store with user data
          storeLogin(response.user, 'token-from-cookie');
        } else {
          // Clear auth state if not authenticated
          logout();
        }
      } catch (error) {
        // Not authenticated, clear state
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [storeLogin, logout]);

  if (isLoading) {
    return <PageLoader />;
  }

  // Public routes that don't require auth
  const publicRoutes = ['/', '/login', '/register', '/terms', '/privacy'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  // If not authenticated and trying to access protected route
  if (!isAuthenticated && !isPublicRoute) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated and trying to access login/register
  if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/register')) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Root component with routing
function AppRoutes() {
  return (
    <AuthGuard>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthGuard>
  );
}

function App() {
  useEffect(() => {
    // Apply saved theme on mount
    const savedTheme = localStorage.getItem('theme-storage');
    if (savedTheme) {
      try {
        const { state } = JSON.parse(savedTheme);
        document.documentElement.classList.toggle('dark', state?.theme === 'dark');
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryProvider>
        <BrowserRouter>
          <AuthProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <AppRoutes />
              
              {/* Global Toast Notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'var(--toast-bg)',
                    color: 'var(--toast-color)',
                    borderRadius: '0.5rem',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                  },
                  success: {
                    style: {
                      background: '#10B981',
                      color: '#fff',
                    },
                    iconTheme: {
                      primary: '#fff',
                      secondary: '#10B981',
                    },
                  },
                  error: {
                    style: {
                      background: '#EF4444',
                      color: '#fff',
                    },
                    iconTheme: {
                      primary: '#fff',
                      secondary: '#EF4444',
                    },
                  },
                  loading: {
                    style: {
                      background: '#6B7280',
                      color: '#fff',
                    },
                  },
                }}
              />
              
              {/* CSS Variables for Toast */}
              <style jsx global>{`
                :root {
                  --toast-bg: #fff;
                  --toast-color: #1F2937;
                }
                
                .dark {
                  --toast-bg: #1F2937;
                  --toast-color: #F9FAFB;
                }
              `}</style>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
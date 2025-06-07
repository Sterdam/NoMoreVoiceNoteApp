// frontend/src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Mic, MessageSquare, Clock, Globe, Shield, Zap, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { useToast } from '../hooks/useToast';
import { useAuthStore } from '../stores/useStore';
import { auth } from '../utils/api';
import LanguageSelector from '../components/LanguageSelector';

const features = [
  {
    icon: Mic,
    titleKey: 'login.features.transcription.title',
    descriptionKey: 'login.features.transcription.description'
  },
  {
    icon: MessageSquare,
    titleKey: 'login.features.whatsapp.title',
    descriptionKey: 'login.features.whatsapp.description'
  },
  {
    icon: Clock,
    titleKey: 'login.features.realtime.title',
    descriptionKey: 'login.features.realtime.description'
  },
  {
    icon: Globe,
    titleKey: 'login.features.multilingual.title',
    descriptionKey: 'login.features.multilingual.description'
  }
];

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { login: storeLogin, isAuthenticated } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Auto-focus on email field
  useEffect(() => {
    const emailInput = document.getElementById('email-input');
    if (emailInput) {
      emailInput.focus();
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = t('login.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('login.errors.invalidEmail');
    }

    if (!formData.password) {
      newErrors.password = t('login.errors.passwordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await auth.login(formData);
      
      if (response.success && response.user) {
        // Store user data and token
        storeLogin(response.user, response.token);
        
        // Show success message
        toast.success(t('login.success'));
        
        // Force navigation to dashboard
        const from = location.state?.from?.pathname || '/dashboard';
        
        // Use a small timeout to ensure state updates are processed
        setTimeout(() => {
          navigate(from, { replace: true });
          // Force reload if navigation doesn't work
          if (window.location.pathname !== from) {
            window.location.href = from;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || t('login.errors.generic');
      
      if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('credentials')) {
        setErrors({ email: ' ', password: t('login.errors.invalidCredentials') });
        toast.error(t('login.errors.invalidCredentials'));
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex">
      {/* Left side - Login Form */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full lg:w-1/2 flex items-center justify-center p-8"
      >
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8">
            {/* Language Selector */}
            <div className="flex justify-between items-center mb-6">
              <Link to="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                ← {t('common.back')}
              </Link>
              <LanguageSelector />
            </div>

            {/* Logo and Title */}
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 dark:bg-primary-900/20 rounded-full mb-4">
                <Mic className="w-10 h-10 text-primary-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('login.title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {t('login.subtitle')}
              </p>
            </motion.div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  id="email-input"
                  type="email"
                  name="email"
                  label={t('login.form.email')}
                  placeholder={t('login.form.emailPlaceholder')}
                  value={formData.email}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  error={errors.email}
                  icon={<Mail className="w-5 h-5 text-gray-400" />}
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              <div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    label={t('login.form.password')}
                    placeholder={t('login.form.passwordPlaceholder')}
                    value={formData.password}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    error={errors.password}
                    icon={<Lock className="w-5 h-5 text-gray-400" />}
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                    defaultChecked
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    {t('login.form.rememberMe')}
                  </span>
                </label>
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
                >
                  {t('login.form.forgotPassword')}
                </Link>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={isLoading ? 'loading' : 'idle'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        {t('login.form.submit')}
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </AnimatePresence>

              {/* Demo credentials hint */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                  <p className="text-blue-700 dark:text-blue-300 font-medium">Mode démo :</p>
                  <p className="text-blue-600 dark:text-blue-400">Email: demo@voxkill.com</p>
                  <p className="text-blue-600 dark:text-blue-400">Mot de passe: demo123</p>
                </div>
              )}
            </form>

            {/* Sign up link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('login.noAccount')}{' '}
                <Link 
                  to="/register" 
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  {t('login.signUp')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Right side - Features */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-700 text-white items-center justify-center p-8 relative overflow-hidden"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="max-w-lg relative z-10">
          <h2 className="text-4xl font-bold mb-6">
            {t('login.hero.title')}
          </h2>
          <p className="text-xl mb-12 text-primary-100">
            {t('login.hero.subtitle')}
          </p>

          <div className="space-y-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.titleKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                className="flex items-start space-x-4"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="text-primary-100">
                    {t(feature.descriptionKey)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-12 p-6 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span className="font-semibold">{t('login.security.title')}</span>
              </div>
              <Zap className="w-5 h-5 text-yellow-300" />
            </div>
            <p className="text-sm text-primary-100">
              {t('login.security.description')}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
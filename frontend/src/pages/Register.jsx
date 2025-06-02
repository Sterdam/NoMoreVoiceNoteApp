import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Mail, Lock, Phone, Eye, EyeOff, Mic, ArrowRight, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../stores/useStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../hooks/useToast';
import { useTranslation } from 'react-i18next';
import { Logo } from '../components/Logo';

export default function Register() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { login } = useAuthStore();
  
  const benefits = [
    t('auth.register.benefits.freeTranscriptions'),
    t('auth.register.benefits.multilingual'),
    t('auth.register.benefits.security'),
    t('auth.register.benefits.noCreditCard')
  ];
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/register', data, {
        withCredentials: true
      });
      
      if (response.data.user && response.data.token) {
        login(response.data.user, response.data.token);
        toast.success(t('auth.register.success'));
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || t('auth.register.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Benefits */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-500 to-purple-600">
        <div className="flex items-center justify-center p-12 w-full">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="text-white max-w-lg"
          >
            <Mic className="h-16 w-16 mb-8" />
            <h2 className="text-4xl font-bold mb-6">
              {t('auth.register.startFree')}
            </h2>
            <p className="text-xl mb-8 text-primary-100">
              {t('auth.register.createAccountBenefit')}
            </p>
            
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center"
                >
                  <CheckCircle className="h-6 w-6 mr-3 flex-shrink-0" />
                  <span className="text-lg">{benefit}</span>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-12 p-6 bg-white/10 backdrop-blur-sm rounded-xl"
            >
              <p className="text-sm text-primary-100 mb-2">
                {t('auth.register.userCount')}
              </p>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="h-5 w-5 text-yellow-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-2 text-sm">{t('auth.register.rating')}</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full space-y-8"
        >
          <div className="text-center">
            <Link to="/" className="inline-flex items-center justify-center mb-8">
              <Logo className="h-32 w-32" />
            </Link>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('auth.register.title')}
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('auth.register.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('auth.register.emailLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t('auth.register.emailPlaceholder')}
                    className="pl-10"
                    {...register('email', {
                      required: t('auth.validation.emailRequired'),
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: t('auth.validation.emailInvalid')
                      }
                    })}
                    error={errors.email?.message}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('auth.register.whatsappLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="whatsappNumber"
                    type="tel"
                    autoComplete="tel"
                    placeholder={t('auth.register.whatsappPlaceholder')}
                    className="pl-10"
                    {...register('whatsappNumber', {
                      required: t('auth.validation.whatsappRequired'),
                      pattern: {
                        value: /^\+?[1-9]\d{1,14}$/,
                        message: t('auth.validation.whatsappInvalid')
                      }
                    })}
                    error={errors.whatsappNumber?.message}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('auth.register.whatsappHelp')}
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('auth.register.passwordLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={t('auth.register.passwordPlaceholder')}
                    className="pl-10 pr-10"
                    {...register('password', {
                      required: t('auth.validation.passwordRequired'),
                      minLength: {
                        value: 6,
                        message: t('auth.validation.passwordMinLength')
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message: t('auth.validation.passwordComplexity')
                      }
                    })}
                    error={errors.password?.message}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-0.5"
                  {...register('terms', {
                    required: t('auth.validation.termsRequired')
                  })}
                />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {t('auth.register.termsPrefix')}{' '}
                  <Link to="/terms" target="_blank" className="text-primary-600 hover:text-primary-500">
                    {t('auth.register.termsLink')}
                  </Link>{' '}
                  {t('auth.register.termsMiddle')}{' '}
                  <Link to="/privacy" target="_blank" className="text-primary-600 hover:text-primary-500">
                    {t('auth.register.privacyLink')}
                  </Link>
                </span>
              </label>
              {errors.terms && (
                <p className="mt-1 text-sm text-red-600">{errors.terms.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('auth.register.loading')}
                </span>
              ) : (
                <span className="flex items-center">
                  {t('auth.register.submitButton')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </span>
              )}
            </Button>

            <div className="text-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('auth.register.alreadyHaveAccount')}{' '}
              </span>
              <Link
                to="/login"
                className="text-sm text-primary-600 hover:text-primary-500 font-medium"
              >
                {t('auth.register.loginLink')}
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
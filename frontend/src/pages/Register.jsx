// frontend/src/pages/Register.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Phone, ArrowRight, Check, X, Eye, EyeOff, Mic, Zap, Globe, Star, Shield, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { useToast } from '../hooks/useToast';
import { useAuthStore } from '../stores/useStore';
import { auth } from '../utils/api';
import LanguageSelector from '../components/LanguageSelector';

const benefits = [
  {
    icon: Zap,
    titleKey: 'register.benefits.instant.title',
    descriptionKey: 'register.benefits.instant.description'
  },
  {
    icon: Globe,
    titleKey: 'register.benefits.multilingual.title', 
    descriptionKey: 'register.benefits.multilingual.description'
  },
  {
    icon: Shield,
    titleKey: 'register.benefits.secure.title',
    descriptionKey: 'register.benefits.secure.description'
  },
  {
    icon: Star,
    titleKey: 'register.benefits.trial.title',
    descriptionKey: 'register.benefits.trial.description'
  }
];

const passwordRequirements = [
  { regex: /.{8,}/, key: 'register.password.length' },
  { regex: /[A-Z]/, key: 'register.password.uppercase' },
  { regex: /[a-z]/, key: 'register.password.lowercase' },
  { regex: /[0-9]/, key: 'register.password.number' }
];

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { login: storeLogin, isAuthenticated } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    whatsappNumber: '',
    terms: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState([]);
  const [phoneFormatted, setPhoneFormatted] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Auto-focus on email field
  useEffect(() => {
    const emailInput = document.getElementById('email-input');
    if (emailInput) {
      emailInput.focus();
    }
  }, []);

  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    let cleaned = value.replace(/\D/g, '');
    
    // Format the number
    if (cleaned.length <= 2) {
      return `+${cleaned}`;
    } else if (cleaned.length <= 5) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
    } else if (cleaned.length <= 8) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
    } else {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 12)}`;
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'whatsappNumber') {
      const formatted = formatPhoneNumber(value);
      setPhoneFormatted(formatted);
      setFormData(prev => ({ ...prev, [name]: formatted.replace(/\s/g, '') }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // Check password strength
    if (name === 'password') {
      const strength = passwordRequirements.map(req => ({
        ...req,
        met: req.regex.test(value)
      }));
      setPasswordStrength(strength);
    }

    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = t('register.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('register.errors.invalidEmail');
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = t('register.errors.passwordRequired');
    } else if (formData.password.length < 8) {
      newErrors.password = t('register.errors.passwordTooShort');
    }

    // Confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('register.errors.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('register.errors.passwordsMismatch');
    }

    // WhatsApp validation
    if (!formData.whatsappNumber) {
      newErrors.whatsappNumber = t('register.errors.whatsappRequired');
    } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.whatsappNumber)) {
      newErrors.whatsappNumber = t('register.errors.invalidWhatsapp');
    }

    // Terms validation
    if (!formData.terms) {
      newErrors.terms = t('register.errors.termsRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await auth.register({
        email: formData.email,
        password: formData.password,
        whatsappNumber: formData.whatsappNumber,
        terms: formData.terms
      });
      
      if (response.success) {
        // Store user data
        storeLogin(response.user, response.token);
        
        // Show success message
        toast.success(t('register.success'));
        
        // Navigate to dashboard
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
          // Force reload if navigation doesn't work
          if (window.location.pathname !== '/dashboard') {
            window.location.href = '/dashboard';
          }
        }, 100);
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.error || t('register.errors.generic');
      
      if (errorMessage.includes('email') && errorMessage.includes('utilisé')) {
        setErrors({ email: t('register.errors.emailTaken') });
      } else if (errorMessage.includes('WhatsApp') && errorMessage.includes('utilisé')) {
        setErrors({ whatsappNumber: t('register.errors.whatsappTaken') });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex">
      {/* Left side - Benefits */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-700 text-white items-center justify-center p-8 relative overflow-hidden"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-10 w-40 h-40 bg-white rounded-full"></div>
          <div className="absolute bottom-20 left-10 w-60 h-60 bg-white rounded-full"></div>
        </div>

        <div className="max-w-lg relative z-10">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6 backdrop-blur-sm">
              <Mic className="w-10 h-10" />
            </div>
            <h2 className="text-4xl font-bold mb-4">
              {t('register.hero.title')}
            </h2>
            <p className="text-xl text-primary-100">
              {t('register.hero.subtitle')}
            </p>
          </motion.div>

          <div className="space-y-6 mb-12">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.titleKey}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                className="flex items-start space-x-4"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <benefit.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    {t(benefit.titleKey)}
                  </h3>
                  <p className="text-primary-100">
                    {t(benefit.descriptionKey)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="p-6 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20"
          >
            <div className="flex items-center space-x-3 mb-3">
              <MessageSquare className="w-6 h-6" />
              <span className="font-semibold text-lg">{t('register.testimonial.title')}</span>
            </div>
            <p className="text-primary-100 italic">
              "{t('register.testimonial.quote')}"
            </p>
            <p className="text-sm text-primary-200 mt-2">
              — {t('register.testimonial.author')}
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Right side - Register Form */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full lg:w-1/2 flex items-center justify-center p-8"
      >
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8">
            {/* Language Selector and Back */}
            <div className="flex justify-between items-center mb-6">
              <Link to="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                ← {t('common.back')}
              </Link>
              <LanguageSelector />
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('register.title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {t('register.subtitle')}
              </p>
            </div>

            {/* Register Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Input
                  id="email-input"
                  type="email"
                  name="email"
                  label={t('register.form.email')}
                  placeholder={t('register.form.emailPlaceholder')}
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  icon={<Mail className="w-5 h-5 text-gray-400" />}
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Input
                  type="tel"
                  name="whatsappNumber"
                  label={t('register.form.whatsappNumber')}
                  placeholder="+33 6 12 34 56 78"
                  value={phoneFormatted}
                  onChange={handleChange}
                  error={errors.whatsappNumber}
                  icon={<Phone className="w-5 h-5 text-gray-400" />}
                  autoComplete="tel"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('register.form.whatsappHint')}
                </p>
              </div>

              <div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    label={t('register.form.password')}
                    placeholder={t('register.form.passwordPlaceholder')}
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    icon={<Lock className="w-5 h-5 text-gray-400" />}
                    autoComplete="new-password"
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
                
                {/* Password strength indicator */}
                {formData.password && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 space-y-1"
                  >
                    {passwordStrength.map((req, index) => (
                      <div key={index} className="flex items-center space-x-2 text-xs">
                        {req.met ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <X className="w-3 h-3 text-gray-300" />
                        )}
                        <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                          {t(req.key)}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>

              <div>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    label={t('register.form.confirmPassword')}
                    placeholder={t('register.form.confirmPasswordPlaceholder')}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    icon={<Lock className="w-5 h-5 text-gray-400" />}
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    name="terms"
                    checked={formData.terms}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 mt-0.5"
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    {t('register.form.agreeToTerms')}{' '}
                    <Link to="/terms" className="text-primary-600 hover:text-primary-500">
                      {t('register.form.termsOfService')}
                    </Link>{' '}
                    {t('register.form.and')}{' '}
                    <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
                      {t('register.form.privacyPolicy')}
                    </Link>
                  </span>
                </label>
                {errors.terms && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.terms}</p>
                )}
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
                    disabled={isLoading || !formData.terms}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        {t('register.form.submit')}
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </AnimatePresence>
            </form>

            {/* Sign in link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('register.alreadyHaveAccount')}{' '}
                <Link 
                  to="/login" 
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  {t('register.signIn')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
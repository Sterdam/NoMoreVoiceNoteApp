import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Mic, Clock, Shield, Zap, Check, ChevronRight,
  Star, Globe, Headphones, BarChart3, Smartphone
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import LanguageSelector from '../components/LanguageSelector';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Landing() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Mic className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                VoxKill
              </span>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSelector />
              <Link to="/login">
                <Button variant="ghost">{t('nav.login')}</Button>
              </Link>
              <Link to="/register">
                <Button>{t('nav.register')}</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              {t('landing.hero.title')}
              <span className="text-primary-600"> {t('landing.hero.whatsapp')}</span> {t('landing.hero.intoText')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
              {t('landing.hero.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  {t('landing.hero.tryFree')}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                {t('landing.hero.seeDemo')}
              </Button>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {t('landing.hero.benefits')}
            </p>
          </motion.div>

          {/* Hero Image/Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-16 relative"
          >
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-1">
              <div className="bg-white dark:bg-gray-900 rounded-xl p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <Headphones className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">WhatsApp Voice Note</p>
                      <p className="text-sm text-gray-500">2:34 {t('common.minutes')}</p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="w-6 h-6 text-primary-600" />
                  </motion.div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary-600"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2, delay: 0.5 }}
                    />
                  </div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.5 }}
                    className="text-gray-700 dark:text-gray-300 mt-4"
                  >
                    {t('landing.hero.demoText')}
                  </motion.p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.features.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {t('landing.features.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: t('landing.features.instant.title'),
                description: t('landing.features.instant.description')
              },
              {
                icon: Globe,
                title: t('landing.features.multilingual.title'),
                description: t('landing.features.multilingual.description')
              },
              {
                icon: Shield,
                title: t('landing.features.security.title'),
                description: t('landing.features.security.description')
              },
              {
                icon: Smartphone,
                title: t('landing.features.simple.title'),
                description: t('landing.features.simple.description')
              },
              {
                icon: BarChart3,
                title: t('landing.features.dashboard.title'),
                description: t('landing.features.dashboard.description')
              },
              {
                icon: Clock,
                title: t('landing.features.timeSaving.title'),
                description: t('landing.features.timeSaving.description')
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6"
              >
                <feature.icon className="w-12 h-12 text-primary-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {t('landing.pricing.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: t('landing.pricing.free.title'),
                price: t('landing.pricing.free.price'),
                period: t('common.forever'),
                features: [
                  t('landing.pricing.free.features.transcriptions'),
                  t('landing.pricing.free.features.duration'),
                  t('landing.pricing.free.features.languages'),
                  t('landing.pricing.free.features.history')
                ],
                cta: t('common.start'),
                variant: 'outline'
              },
              {
                name: t('landing.pricing.pro.title'),
                price: t('landing.pricing.pro.price'),
                period: t('common.perMonth'),
                features: [
                  t('landing.pricing.pro.features.transcriptions'),
                  t('landing.pricing.pro.features.duration'),
                  t('landing.pricing.pro.features.languages'),
                  t('landing.pricing.pro.features.history'),
                  t('landing.pricing.pro.features.export'),
                  t('landing.pricing.pro.features.support')
                ],
                cta: t('landing.pricing.pro.trial'),
                variant: 'primary',
                popular: true
              },
              {
                name: t('landing.pricing.business.title'),
                price: t('landing.pricing.business.price'),
                period: t('common.perMonth'),
                features: [
                  t('landing.pricing.business.features.transcriptions'),
                  t('landing.pricing.business.features.duration'),
                  t('landing.pricing.business.features.api'),
                  t('landing.pricing.business.features.accounts'),
                  t('landing.pricing.business.features.billing'),
                  t('landing.pricing.business.features.support')
                ],
                cta: t('common.contact'),
                variant: 'outline'
              }
            ].map((plan, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-2xl p-8 ${
                  plan.popular 
                    ? 'bg-primary-600 text-white shadow-xl scale-105' 
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-semibold">
                      {t('common.popular')}
                    </span>
                  </div>
                )}
                <h3 className={`text-2xl font-bold mb-2 ${
                  plan.popular ? 'text-white' : 'text-gray-900 dark:text-white'
                }`}>
                  {plan.name}
                </h3>
                <div className="mb-6">
                  <span className={`text-4xl font-bold ${
                    plan.popular ? 'text-white' : 'text-gray-900 dark:text-white'
                  }`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ml-2 ${
                    plan.popular ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center">
                      <Check className={`w-5 h-5 mr-3 ${
                        plan.popular ? 'text-primary-100' : 'text-primary-600'
                      }`} />
                      <span className={
                        plan.popular ? 'text-primary-50' : 'text-gray-600 dark:text-gray-400'
                      }>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button 
                  variant={plan.popular ? 'secondary' : plan.variant}
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.testimonials.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {t('landing.testimonials.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: t('landing.testimonials.testimonial1.name'),
                role: t('landing.testimonials.testimonial1.role'),
                content: t('landing.testimonials.testimonial1.text'),
                rating: 5
              },
              {
                name: t('landing.testimonials.testimonial2.name'),
                role: t('landing.testimonials.testimonial2.role'),
                content: t('landing.testimonials.testimonial2.text'),
                rating: 5
              },
              {
                name: t('landing.testimonials.testimonial3.name'),
                role: t('landing.testimonials.testimonial3.role'),
                content: t('landing.testimonials.testimonial3.text'),
                rating: 5
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6"
              >
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {testimonial.role}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-3xl p-12 text-white"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('landing.cta.title')}
            </h2>
            <p className="text-xl mb-8 text-primary-100">
              {t('landing.cta.subtitle')}
            </p>
            <Link to="/register">
              <Button size="lg" variant="secondary">
                {t('landing.cta.button')}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="mt-4 text-sm text-primary-100">
              {t('landing.cta.benefits')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Mic className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                  VoiceNote Pro
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {t('landing.footer.description')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">{t('landing.footer.product.title')}</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-primary-600">{t('landing.footer.product.features')}</a></li>
                <li><a href="#" className="hover:text-primary-600">{t('landing.footer.product.pricing')}</a></li>
                <li><a href="#" className="hover:text-primary-600">{t('landing.footer.product.api')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">{t('landing.footer.support.title')}</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-primary-600">{t('landing.footer.support.help')}</a></li>
                <li><a href="#" className="hover:text-primary-600">{t('landing.footer.support.contact')}</a></li>
                <li><a href="#" className="hover:text-primary-600">{t('landing.footer.support.faq')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">{t('landing.footer.legal.title')}</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-primary-600">{t('landing.footer.legal.privacy')}</a></li>
                <li><a href="#" className="hover:text-primary-600">{t('landing.footer.legal.terms')}</a></li>
                <li><a href="#" className="hover:text-primary-600">{t('landing.footer.legal.gdpr')}</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 text-center text-gray-600 dark:text-gray-400">
            <p>{t('landing.footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
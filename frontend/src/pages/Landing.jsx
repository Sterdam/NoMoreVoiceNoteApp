import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Mic, FileText, Clock, Shield, Zap, Check, ChevronRight,
  Star, Users, Globe, Headphones, BarChart3, Smartphone
} from 'lucide-react';
import { Button } from '../components/ui/Button';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Landing() {
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
              <Link to="/login">
                <Button variant="ghost">Connexion</Button>
              </Link>
              <Link to="/register">
                <Button>Commencer gratuitement</Button>
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
              Transformez vos notes vocales
              <span className="text-primary-600"> WhatsApp</span> en texte
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
              Plus besoin d'écouter de longues notes vocales. Notre IA transcrit instantanément 
              vos messages WhatsApp avec une précision exceptionnelle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Essayer gratuitement
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Voir la démo
              </Button>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              ✓ 10 transcriptions gratuites • ✓ Sans carte bancaire
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
                      <p className="text-sm text-gray-500">2:34 min</p>
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
                    "Salut! Je voulais te dire que la réunion de demain est reportée à 15h.
                    N'oublie pas d'apporter les documents..."
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
              Pourquoi choisir VoiceNote Pro?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Des fonctionnalités puissantes pour simplifier votre quotidien
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Transcription instantanée',
                description: 'Recevez vos transcriptions en quelques secondes, directement dans WhatsApp.'
              },
              {
                icon: Globe,
                title: 'Support multilingue',
                description: 'Transcription précise en français, anglais, espagnol et plus de 50 langues.'
              },
              {
                icon: Shield,
                title: 'Sécurité maximale',
                description: 'Vos données sont chiffrées et supprimées après traitement. Confidentialité garantie.'
              },
              {
                icon: Smartphone,
                title: 'Simple à utiliser',
                description: 'Envoyez simplement vos notes vocales à notre bot WhatsApp. C\'est tout!'
              },
              {
                icon: BarChart3,
                title: 'Tableau de bord',
                description: 'Suivez votre utilisation et accédez à l\'historique de vos transcriptions.'
              },
              {
                icon: Clock,
                title: 'Gain de temps',
                description: 'Plus besoin d\'écouter des messages de 10 minutes. Lisez en 30 secondes.'
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
              Tarifs simples et transparents
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Commencez gratuitement, évoluez selon vos besoins
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Gratuit',
                price: '0€',
                period: 'pour toujours',
                features: [
                  '10 transcriptions par mois',
                  'Messages jusqu\'à 5 minutes',
                  'Français et anglais',
                  'Historique 7 jours'
                ],
                cta: 'Commencer',
                variant: 'outline'
              },
              {
                name: 'Pro',
                price: '9,99€',
                period: 'par mois',
                features: [
                  '500 transcriptions par mois',
                  'Messages jusqu\'à 30 minutes',
                  'Toutes les langues',
                  'Historique illimité',
                  'Export PDF/TXT',
                  'Support prioritaire'
                ],
                cta: 'Essai gratuit 7 jours',
                variant: 'primary',
                popular: true
              },
              {
                name: 'Business',
                price: '29,99€',
                period: 'par mois',
                features: [
                  'Transcriptions illimitées',
                  'Pas de limite de durée',
                  'API dédiée',
                  'Comptes multiples',
                  'Facturation entreprise',
                  'Support 24/7'
                ],
                cta: 'Contacter',
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
                      Plus populaire
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
              Ils nous font confiance
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Découvrez ce que nos utilisateurs disent de nous
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Marie Laurent',
                role: 'Chef de projet',
                content: 'Un gain de temps incroyable! Je peux enfin gérer les notes vocales de mes collègues sans y passer des heures.',
                rating: 5
              },
              {
                name: 'Thomas Dubois',
                role: 'Entrepreneur',
                content: 'La transcription est d\'une précision remarquable. L\'outil parfait pour ne rien manquer d\'important.',
                rating: 5
              },
              {
                name: 'Sophie Martin',
                role: 'Consultante',
                content: 'Simple, efficace et sécurisé. Je recommande à tous ceux qui reçoivent beaucoup de notes vocales.',
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
              Prêt à simplifier votre quotidien?
            </h2>
            <p className="text-xl mb-8 text-primary-100">
              Rejoignez des milliers d'utilisateurs qui gagnent du temps chaque jour
            </p>
            <Link to="/register">
              <Button size="lg" variant="secondary">
                Commencer gratuitement
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="mt-4 text-sm text-primary-100">
              10 transcriptions gratuites • Sans engagement
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
                La solution de transcription WhatsApp la plus simple et efficace.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Produit</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-primary-600">Fonctionnalités</a></li>
                <li><a href="#" className="hover:text-primary-600">Tarifs</a></li>
                <li><a href="#" className="hover:text-primary-600">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Support</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-primary-600">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-primary-600">Contact</a></li>
                <li><a href="#" className="hover:text-primary-600">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Légal</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-primary-600">Confidentialité</a></li>
                <li><a href="#" className="hover:text-primary-600">Conditions</a></li>
                <li><a href="#" className="hover:text-primary-600">RGPD</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 text-center text-gray-600 dark:text-gray-400">
            <p>&copy; 2024 VoiceNote Pro. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
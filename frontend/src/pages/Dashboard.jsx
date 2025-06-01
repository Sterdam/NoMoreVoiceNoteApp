import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, FileText, Settings, CreditCard, LogOut, Search,
  Filter, Download, Trash2, Calendar, Clock, Languages, TrendingUp,
  Mic, MessageSquare, BarChart3, PieChart, Activity, ChevronRight,
  QrCode, Check, X, Loader2, AlertCircle, Phone, Star, Menu, Moon, Sun
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RePieChart, 
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

// Components
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner, LoadingSkeleton } from '../components/ui/LoadingSpinner';
import { useToast } from '../hooks/useToast';

// Stores
import { useAuthStore, useTranscriptStore, useThemeStore } from '../stores/useStore';
import axios from '../utils/api';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: 'overview' },
  { icon: FileText, label: 'Transcriptions', path: 'transcripts' },
  { icon: QrCode, label: 'WhatsApp', path: 'whatsapp' },
  { icon: CreditCard, label: 'Abonnement', path: 'subscription' },
  { icon: Settings, label: 'Paramètres', path: 'settings' },
];

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [dateFilter, setDateFilter] = useState('all');
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { setTranscripts } = useTranscriptStore();

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Handle payment return
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      toast.success('Paiement réussi ! Votre abonnement est maintenant actif.');
      setActiveSection('subscription');
    } else if (payment === 'cancelled') {
      toast.error('Paiement annulé.');
    }
  }, [searchParams]);

  // Queries
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [status, subscription, profile, stats] = await Promise.all([
        axios.get('/api/users/whatsapp-status'),
        axios.get('/api/payment/subscription'),
        axios.get('/api/users/profile'),
        axios.get('/api/transcripts/stats')
      ]);
      return {
        whatsappStatus: status.data,
        subscription: subscription.data.subscription,
        usage: subscription.data.usage,
        settings: profile.data.settings,
        stats: stats.data
      };
    }
  });

  const { data: transcripts, isLoading: loadingTranscripts } = useQuery({
    queryKey: ['transcripts', searchQuery, dateFilter],
    queryFn: async () => {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (dateFilter !== 'all') {
        const now = new Date();
        switch (dateFilter) {
          case 'today':
            params.from = new Date().setHours(0, 0, 0, 0);
            break;
          case 'week':
            params.from = subDays(now, 7);
            break;
          case 'month':
            params.from = startOfMonth(now);
            break;
        }
      }
      const response = await axios.get('/api/transcripts', { params });
      setTranscripts(response.data.transcripts);
      return response.data.transcripts;
    },
    enabled: activeSection === 'transcripts'
  });

  const { data: qrCode, refetch: refetchQR } = useQuery({
    queryKey: ['whatsapp-qr'],
    queryFn: async () => {
      const response = await axios.get('/api/transcripts/whatsapp-qr');
      return response.data;
    },
    enabled: activeSection === 'whatsapp' && !dashboardData?.whatsappStatus?.connected,
    refetchInterval: (data) => {
      if (data?.status === 'pending') return 2000;
      return false;
    }
  });

  // Mutations
  const logoutMutation = useMutation({
    mutationFn: () => axios.post('/api/auth/logout'),
    onSuccess: () => {
      logout();
      navigate('/login');
    }
  });

  const whatsappLogoutMutation = useMutation({
    mutationFn: () => axios.post('/api/users/whatsapp-logout'),
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['whatsapp-qr']);
      toast.success('Déconnecté de WhatsApp');
    }
  });

  const deleteTranscriptMutation = useMutation({
    mutationFn: (id) => axios.delete(`/api/transcripts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['transcripts']);
      toast.success('Transcription supprimée');
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settings) => axios.patch('/api/users/profile', { settings }),
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard']);
      toast.success('Paramètres sauvegardés');
    }
  });

  // Chart data preparation
  const chartData = dashboardData?.stats ? {
    daily: dashboardData.stats.daily.map(d => ({
      date: format(new Date(d.date), 'dd MMM', { locale: fr }),
      transcriptions: d.count,
      minutes: d.minutes
    })),
    languages: Object.entries(dashboardData.stats.languages).map(([lang, count]) => ({
      name: lang,
      value: count,
      color: ['#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#F59E0B'][Object.keys(dashboardData.stats.languages).indexOf(lang)]
    })),
    hourly: dashboardData.stats.hourly.map(h => ({
      hour: `${h.hour}h`,
      count: h.count
    }))
  } : null;

  // Render sections
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Transcriptions totales</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardData?.stats?.total || 0}
                  </p>
                </div>
                <div className="p-3 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
                  <FileText className="h-6 w-6 text-primary-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Minutes transcrites</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardData?.stats?.totalMinutes?.toFixed(1) || 0}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Langues détectées</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Object.keys(dashboardData?.stats?.languages || {}).length}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Languages className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Statut WhatsApp</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardData?.whatsappStatus?.connected ? 'Connecté' : 'Déconnecté'}
                  </p>
                </div>
                <div className={`p-3 ${dashboardData?.whatsappStatus?.connected ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'} rounded-lg`}>
                  <Phone className={`h-6 w-6 ${dashboardData?.whatsappStatus?.connected ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activité quotidienne</CardTitle>
            <CardDescription>Nombre de transcriptions par jour</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="transcriptions" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Langues détectées</CardTitle>
            <CardDescription>Répartition par langue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={chartData?.languages || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData?.languages?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transcripts */}
      <Card>
        <CardHeader>
          <CardTitle>Transcriptions récentes</CardTitle>
          <CardDescription>Vos 5 dernières transcriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData?.stats?.recent?.map((transcript) => (
              <div key={transcript._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {transcript.phoneNumber}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(transcript.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="primary">{transcript.duration}s</Badge>
                  <Badge>{transcript.language}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedTranscript(transcript);
                      setActiveSection('transcripts');
                    }}
                  >
                    Voir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTranscripts = () => (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex gap-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
              >
                <option value="all">Toutes les dates</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
              </select>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcripts List */}
      {loadingTranscripts ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <LoadingSkeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {transcripts?.map((transcript) => (
                <motion.div
                  key={transcript._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {transcript.phoneNumber}
                        </h4>
                        <Badge variant="primary">{transcript.duration}s</Badge>
                        <Badge>{transcript.language}</Badge>
                        {transcript.hasSummary && (
                          <Badge variant="success">Résumé</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {transcript.text}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {format(new Date(transcript.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedTranscript(transcript)}
                      >
                        Voir
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTranscriptMutation.mutate(transcript._id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {transcripts?.length === 0 && (
                <div className="text-center py-12">
                  <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Aucune transcription trouvée
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderWhatsApp = () => (
    <Card>
      <CardHeader>
        <CardTitle>Connexion WhatsApp</CardTitle>
        <CardDescription>
          {dashboardData?.whatsappStatus?.connected
            ? 'Votre compte WhatsApp est connecté'
            : 'Scannez le QR code pour connecter votre compte'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {dashboardData?.whatsappStatus?.connected ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-green-700 dark:text-green-400 mb-6">
              WhatsApp est connecté et prêt à recevoir vos notes vocales !
            </p>
            <Button
              variant="danger"
              onClick={() => whatsappLogoutMutation.mutate()}
            >
              Déconnecter WhatsApp
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            {qrCode?.qr ? (
              <>
                <img
                  src={`data:image/png;base64,${qrCode.qr}`}
                  alt="QR Code WhatsApp"
                  className="mx-auto mb-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg"
                />
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p>1. Ouvrez WhatsApp sur votre téléphone</p>
                  <p>2. Allez dans Paramètres → Appareils connectés</p>
                  <p>3. Scannez ce QR code</p>
                </div>
              </>
            ) : (
              <div className="inline-flex items-center justify-center w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <LoadingSpinner size="lg" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSubscription = () => (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Plan actuel</CardTitle>
          <CardDescription>Gérez votre abonnement et votre utilisation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold capitalize">
                {dashboardData?.subscription?.plan || 'Trial'}
              </h3>
              {dashboardData?.subscription?.plan === 'trial' && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {dashboardData?.subscription?.getRemainingTrial} jours restants
                </p>
              )}
            </div>
            {dashboardData?.subscription?.plan !== 'trial' && (
              <Button
                variant="outline"
                onClick={async () => {
                  const response = await axios.post('/api/payment/create-portal-session');
                  window.location.href = response.data.url;
                }}
              >
                Gérer l'abonnement
              </Button>
            )}
          </div>

          {/* Usage Stats */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Minutes utilisées</span>
                <span className="font-medium">
                  {dashboardData?.usage?.transcriptionsCount} transcriptions
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      ((dashboardData?.subscription?.limits?.minutesPerMonth - dashboardData?.usage?.remainingMinutes) /
                        dashboardData?.subscription?.limits?.minutesPerMonth) *
                        100
                    )}%`
                  }}
                />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {dashboardData?.usage?.remainingMinutes?.toFixed(1)} minutes restantes sur{' '}
                {dashboardData?.subscription?.limits?.minutesPerMonth}
              </p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Résumés utilisés</span>
                <span className="font-medium">
                  {dashboardData?.usage?.summariesCount} résumés
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-purple-600 h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (dashboardData?.usage?.summariesCount /
                        dashboardData?.subscription?.limits?.summariesPerMonth) *
                        100
                    )}%`
                  }}
                />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {dashboardData?.usage?.remainingSummaries} résumés restants sur{' '}
                {dashboardData?.subscription?.limits?.summariesPerMonth}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {['basic', 'pro', 'enterprise'].map((planKey) => {
          const plan = dashboardData?.subscription?.constructor?.PLANS?.[planKey];
          if (!plan || planKey === 'trial') return null;

          const isCurrentPlan = dashboardData?.subscription?.plan === planKey;
          const planIcons = {
            basic: '🚀',
            pro: '⭐',
            enterprise: '🏢'
          };

          return (
            <Card
              key={planKey}
              className={isCurrentPlan ? 'ring-2 ring-primary-500' : ''}
            >
              <CardHeader>
                <div className="text-center">
                  <span className="text-4xl mb-2">{planIcons[planKey]}</span>
                  <CardTitle className="capitalize">{planKey}</CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">{plan.price}€</span>
                    <span className="text-gray-600 dark:text-gray-400">/mois</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {plan.limits.minutesPerMonth / 60} heures de transcription
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {plan.limits.summariesPerMonth} résumés
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Audio jusqu'à {plan.limits.maxAudioDuration / 60} min
                  </li>
                  {plan.features?.multiLanguage && (
                    <li className="flex items-center text-sm">
                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      Multi-langues
                    </li>
                  )}
                  {plan.features?.priority && (
                    <li className="flex items-center text-sm">
                      <Star className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                      Traitement prioritaire
                    </li>
                  )}
                </ul>

                <Button
                  className="w-full"
                  disabled={isCurrentPlan}
                  onClick={async () => {
                    const response = await axios.post('/api/payment/create-checkout-session', {
                      planId: planKey
                    });
                    window.location.href = response.data.url;
                  }}
                >
                  {isCurrentPlan ? 'Plan actuel' : 'Choisir ce plan'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres</CardTitle>
        <CardDescription>Personnalisez votre expérience</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateSettingsMutation.mutate(dashboardData?.settings);
          }}
          className="space-y-6"
        >
          {/* Language Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Langue de transcription par défaut
            </label>
            <select
              value={dashboardData?.settings?.transcriptionLanguage || 'fr'}
              onChange={(e) =>
                queryClient.setQueryData(['dashboard'], (old) => ({
                  ...old,
                  settings: { ...old.settings, transcriptionLanguage: e.target.value }
                }))
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
              <option value="pt">Português</option>
            </select>
          </div>

          {/* Auto-summarize */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={dashboardData?.settings?.autoSummarize || false}
                onChange={(e) =>
                  queryClient.setQueryData(['dashboard'], (old) => ({
                    ...old,
                    settings: { ...old.settings, autoSummarize: e.target.checked }
                  }))
                }
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Résumer automatiquement les messages vocaux
              </span>
            </label>
          </div>

          {/* Summary Language */}
          {dashboardData?.settings?.autoSummarize && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Langue des résumés
              </label>
              <select
                value={dashboardData?.settings?.summaryLanguage || 'same'}
                onChange={(e) =>
                  queryClient.setQueryData(['dashboard'], (old) => ({
                    ...old,
                    settings: { ...old.settings, summaryLanguage: e.target.value }
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
              >
                <option value="same">Même langue que la transcription</option>
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
              </select>
            </div>
          )}

          <div className="pt-4">
            <Button
              type="submit"
              disabled={updateSettingsMutation.isLoading}
            >
              {updateSettingsMutation.isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Sauvegarde...
                </>
              ) : (
                'Sauvegarder les paramètres'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || window.innerWidth >= 1024) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 shadow-lg"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <Mic className="h-8 w-8 text-primary-600" />
                  <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                    VoxKill
                  </span>
                </div>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {theme === 'light' ? (
                    <Moon className="h-5 w-5 text-gray-600" />
                  ) : (
                    <Sun className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>

              <nav className="flex-1 p-4">
                <ul className="space-y-2">
                  {sidebarItems.map((item) => (
                    <li key={item.path}>
                      <button
                        onClick={() => {
                          setActiveSection(item.path);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                          activeSection === item.path
                            ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-600">
                        {user?.email?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user?.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Plan {dashboardData?.subscription?.plan || 'trial'}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => logoutMutation.mutate()}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className={`${sidebarOpen || window.innerWidth >= 1024 ? 'lg:ml-64' : ''} p-6 pt-20 lg:pt-6`}>
        <div className="max-w-7xl mx-auto">
          {loadingDashboard ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              {activeSection === 'overview' && renderOverview()}
              {activeSection === 'transcripts' && renderTranscripts()}
              {activeSection === 'whatsapp' && renderWhatsApp()}
              {activeSection === 'subscription' && renderSubscription()}
              {activeSection === 'settings' && renderSettings()}
            </>
          )}
        </div>
      </main>

      {/* Transcript Modal */}
      <Modal
        isOpen={!!selectedTranscript}
        onClose={() => setSelectedTranscript(null)}
        title="Détails de la transcription"
        className="max-w-3xl"
      >
        {selectedTranscript && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Informations</h4>
              <div className="mt-2 space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Numéro:</span> {selectedTranscript.phoneNumber}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Date:</span>{' '}
                  {format(new Date(selectedTranscript.createdAt), 'dd MMMM yyyy à HH:mm', {
                    locale: fr
                  })}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Durée:</span> {selectedTranscript.duration} secondes
                </p>
                <p className="text-sm">
                  <span className="font-medium">Langue:</span> {selectedTranscript.language}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Transcription
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedTranscript.text}
                </p>
              </div>
            </div>

            {selectedTranscript.summary && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Résumé
                </h4>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {selectedTranscript.summary}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(selectedTranscript.text);
                  toast.success('Transcription copiée');
                }}
              >
                Copier le texte
              </Button>
              <Button onClick={() => setSelectedTranscript(null)}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
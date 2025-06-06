import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, FileText, Settings, CreditCard, LogOut, Search,
  Filter, Download, Trash2, Calendar, Clock, Languages, TrendingUp,
  Mic, MessageSquare, BarChart3, PieChart, Activity, ChevronRight,
  QrCode, Check, X, Loader2, AlertCircle, Phone, Star, Menu, Moon, Sun, Zap, RefreshCw
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RePieChart, 
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Components
import { Button } from '../components/ui/Button';
import LanguageSelector from '../components/LanguageSelector';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner, LoadingSkeleton } from '../components/ui/LoadingSpinner';
import { useToast } from '../hooks/useToast';
import { SummaryLevelSelector } from '../components/SummaryLevelSelector';

// Stores
import { useAuthStore, useTranscriptStore, useThemeStore } from '../stores/useStore';
import api, { auth, users, transcripts, payment } from '../utils/api';


const sidebarItems = [
  { icon: LayoutDashboard, label: 'dashboard.sidebar.overview', path: 'overview' },
  { icon: FileText, label: 'dashboard.sidebar.transcriptions', path: 'transcripts' },
  { icon: QrCode, label: 'dashboard.sidebar.whatsapp', path: 'whatsapp' },
  { icon: CreditCard, label: 'dashboard.sidebar.subscription', path: 'subscription' },
  { icon: Settings, label: 'dashboard.sidebar.settings', path: 'settings' },
];

// Helper function to format dates
const formatDate = (date, formatStr) => {
  const d = new Date(date);
  if (formatStr === 'dd MMM') {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  } else if (formatStr === 'dd MMM yyyy à HH:mm' || formatStr === 'dd MMMM yyyy à HH:mm') {
    const months = formatStr.includes('MMMM') 
      ? ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
      : ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} à ${hours}:${minutes}`;
  }
  return d.toLocaleDateString();
};

// Helper to get date ranges
const subDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
};

const startOfMonth = (date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [urlParams, setUrlParams] = useState({});
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const qrPollingInterval = useRef(null);
  
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { setTranscripts } = useTranscriptStore();

  // Get URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramsObj = {};
    for (const [key, value] of params.entries()) {
      paramsObj[key] = value;
    }
    setUrlParams(paramsObj);
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Handle payment return
  useEffect(() => {
    const payment = urlParams.payment;
    if (payment === 'success') {
      toast.success(t('dashboard.payment.success'));
      setActiveSection('subscription');
    } else if (payment === 'cancelled') {
      toast.error(t('dashboard.payment.cancelled'));
    }
  }, [urlParams]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (qrPollingInterval.current) {
        clearInterval(qrPollingInterval.current);
      }
    };
  }, []);

  // Function to check WhatsApp status
  const checkWhatsAppStatus = async () => {
    try {
      const response = await users.getWhatsAppStatus();
      const isConnected = response.connected;
      setWhatsappStatus(isConnected ? 'connected' : 'disconnected');
      
      // If connected, clear QR code and stop polling
      if (isConnected) {
        setQrCode(null);
        if (qrPollingInterval.current) {
          clearInterval(qrPollingInterval.current);
          qrPollingInterval.current = null;
        }
      }
      
      return isConnected;
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      return false;
    }
  };

  // Function to fetch QR code
  const fetchQRCode = async () => {
    try {
      setQrLoading(true);
      const response = await transcripts.getWhatsAppQR();
      
      if (response.status === 'connected') {
        setWhatsappStatus('connected');
        setQrCode(null);
        if (qrPollingInterval.current) {
          clearInterval(qrPollingInterval.current);
          qrPollingInterval.current = null;
        }
        queryClient.invalidateQueries(['dashboard']);
      } else if (response.qr) {
        setQrCode(response.qr);
        setWhatsappStatus('pending');
      } else if (response.status === 'pending') {
        // Keep polling if QR is being generated
        if (!qrPollingInterval.current) {
          startQRPolling();
        }
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
      toast.error(t('dashboard.whatsapp.qrGenerationError'));
    } finally {
      setQrLoading(false);
    }
  };

  // Function to start polling for QR code
  const startQRPolling = () => {
    if (qrPollingInterval.current) {
      clearInterval(qrPollingInterval.current);
    }
    
    // Poll every 3 seconds
    qrPollingInterval.current = setInterval(async () => {
      try {
        const response = await transcripts.getWhatsAppQR();
        
        if (response.status === 'connected') {
          setWhatsappStatus('connected');
          setQrCode(null);
          clearInterval(qrPollingInterval.current);
          qrPollingInterval.current = null;
          queryClient.invalidateQueries(['dashboard']);
          toast.success(t('dashboard.whatsapp.connected'));
        } else if (response.qr) {
          setQrCode(response.qr);
          setWhatsappStatus('pending');
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);
  };

  // Effect to handle WhatsApp section
  useEffect(() => {
    if (activeSection === 'whatsapp') {
      checkWhatsAppStatus().then(isConnected => {
        if (!isConnected) {
          fetchQRCode();
        }
      });
    } else {
      // Clear polling when leaving WhatsApp section
      if (qrPollingInterval.current) {
        clearInterval(qrPollingInterval.current);
        qrPollingInterval.current = null;
      }
    }
  }, [activeSection]);

  // Queries
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [status, subscription, profile, transcriptsList] = await Promise.all([
        users.getWhatsAppStatus(),
        payment.getSubscription(),
        users.getProfile(),
        transcripts.getAll({ limit: 1000 })
      ]);
      
      const stats = {
        total: transcriptsList.transcripts.length,
        totalMinutes: transcriptsList.transcripts.reduce((acc, t) => acc + (t.audioLength / 60), 0),
        languages: transcriptsList.transcripts.reduce((acc, t) => {
          acc[t.language] = (acc[t.language] || 0) + 1;
          return acc;
        }, {}),
        recent: transcriptsList.transcripts.slice(0, 5),
        daily: [],
        hourly: []
      };
      
      setWhatsappStatus(status.connected ? 'connected' : 'disconnected');
      
      return {
        whatsappStatus: status,
        subscription: subscription.subscription,
        usage: subscription.usage,
        settings: profile.settings,
        stats
      };
    }
  });

  const { data: transcriptsList, isLoading: loadingTranscripts } = useQuery({
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
      const response = await transcripts.getAll(params);
      setTranscripts(response.transcripts);
      return response.transcripts;
    },
    enabled: activeSection === 'transcripts'
  });

  // Mutations
  const logoutMutation = useMutation({
    mutationFn: () => auth.logout(),
    onSuccess: () => {
      logout();
      window.location.href = '/login';
    }
  });

  const whatsappLogoutMutation = useMutation({
    mutationFn: () => users.whatsappLogout(),
    onSuccess: () => {
      setWhatsappStatus('disconnected');
      setQrCode(null);
      queryClient.invalidateQueries(['dashboard']);
      toast.success(t('dashboard.whatsapp.disconnected'));
      // Restart QR fetching
      if (activeSection === 'whatsapp') {
        setTimeout(fetchQRCode, 1000);
      }
    }
  });

  const regenerateQRMutation = useMutation({
    mutationFn: async () => {
      // First disconnect
      await users.whatsappLogout();
      setWhatsappStatus('disconnected');
      setQrCode(null);
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Then fetch new QR
      return fetchQRCode();
    },
    onError: (error) => {
      console.error('Error regenerating QR:', error);
      toast.error(t('dashboard.whatsapp.regenerateError'));
    }
  });

  const deleteTranscriptMutation = useMutation({
    mutationFn: (id) => transcripts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['transcripts']);
      toast.success(t('dashboard.transcriptions.deleted'));
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settings) => users.updateProfile({ settings }),
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard']);
      toast.success(t('dashboard.settings.saved'));
    }
  });

  // Chart data preparation
  const chartData = dashboardData?.stats ? {
    daily: dashboardData.stats.daily.map(d => ({
      date: formatDate(d.date, 'dd MMM'),
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.overview.totalTranscriptions')}</p>
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.overview.transcribedMinutes')}</p>
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.overview.detectedLanguages')}</p>
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.overview.whatsappStatus')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {whatsappStatus === 'connected' ? t('dashboard.overview.connected') : t('dashboard.overview.disconnected')}
                  </p>
                </div>
                <div className={`p-3 ${whatsappStatus === 'connected' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'} rounded-lg`}>
                  <Phone className={`h-6 w-6 ${whatsappStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`} />
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
            <CardTitle>{t('dashboard.overview.dailyActivity')}</CardTitle>
            <CardDescription>{t('dashboard.overview.transcriptionsPerDay')}</CardDescription>
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
            <CardTitle>{t('dashboard.overview.detectedLanguages')}</CardTitle>
            <CardDescription>{t('dashboard.overview.languageDistribution')}</CardDescription>
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
          <CardTitle>{t('dashboard.overview.recentTranscriptions')}</CardTitle>
          <CardDescription>{t('dashboard.overview.last5Transcriptions')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData?.stats?.recent?.map((transcript) => (
              <div key={transcript._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {transcript.metadata?.fromNumber || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(transcript.createdAt, 'dd MMM yyyy à HH:mm')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="primary">{transcript.audioLength}s</Badge>
                  <Badge>{transcript.language}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedTranscript(transcript);
                      setActiveSection('transcripts');
                    }}
                  >
                    {t('dashboard.transcriptions.view')}
                  </Button>
                </div>
              </div>
            ))}
            {(!dashboardData?.stats?.recent || dashboardData.stats.recent.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                {t('dashboard.overview.noRecentTranscriptions')}
              </div>
            )}
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
                placeholder={t('dashboard.transcriptions.search')}
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
                <option value="all">{t('dashboard.transcriptions.allDates')}</option>
                <option value="today">{t('dashboard.transcriptions.today')}</option>
                <option value="week">{t('dashboard.transcriptions.thisWeek')}</option>
                <option value="month">{t('dashboard.transcriptions.thisMonth')}</option>
              </select>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                {t('dashboard.transcriptions.export')}
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
              {transcriptsList?.map((transcript) => (
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
                          {transcript.metadata?.fromNumber || 'Unknown'}
                        </h4>
                        <Badge variant="primary">{transcript.audioLength}s</Badge>
                        <Badge>{transcript.language}</Badge>
                        {transcript.summary && (
                          <Badge variant="success">{t('dashboard.transcriptions.summary')}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {transcript.text}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {formatDate(transcript.createdAt, 'dd MMM yyyy à HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedTranscript(transcript)}
                      >
                        {t('dashboard.transcriptions.view')}
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
              
              {transcriptsList?.length === 0 && (
                <div className="text-center py-12">
                  <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('dashboard.transcriptions.noTranscriptions')}
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
        <CardTitle>{t('dashboard.whatsapp.title')}</CardTitle>
        <CardDescription>
          {whatsappStatus === 'connected'
            ? t('dashboard.whatsapp.accountConnected')
            : t('dashboard.whatsapp.scanQRCode')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {whatsappStatus === 'connected' ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-green-700 dark:text-green-400 mb-6">
              {t('dashboard.whatsapp.readyToReceive')}
            </p>
            <Button
              variant="danger"
              onClick={() => whatsappLogoutMutation.mutate()}
              disabled={whatsappLogoutMutation.isLoading}
            >
              {whatsappLogoutMutation.isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  {t('dashboard.whatsapp.disconnecting')}
                </>
              ) : (
                t('dashboard.whatsapp.disconnect')
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            {qrCode ? (
              <>
                <div className="relative inline-block mb-6">
                  <img
                    src={`data:image/png;base64,${qrCode}`}
                    alt="QR Code WhatsApp"
                    className="mx-auto border-2 border-gray-200 dark:border-gray-700 rounded-lg"
                    style={{ width: 300, height: 300 }}
                  />
                  {whatsappStatus === 'pending' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 rounded-lg">
                      <div className="bg-white dark:bg-gray-800 p-2 rounded-full">
                        <LoadingSpinner size="sm" />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <p>{t('dashboard.whatsapp.instructions.step1')}</p>
                  <p>{t('dashboard.whatsapp.instructions.step2')}</p>
                  <p>{t('dashboard.whatsapp.instructions.step3')}</p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => regenerateQRMutation.mutate()}
                  disabled={regenerateQRMutation.isLoading}
                >
                  {regenerateQRMutation.isLoading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      {t('dashboard.whatsapp.regenerating')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('dashboard.whatsapp.regenerateQR')}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <LoadingSpinner size="lg" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('dashboard.whatsapp.generatingQR')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('dashboard.whatsapp.waitingForQR')}
                </p>
                
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchQRCode()}
                    disabled={qrLoading}
                  >
                    {qrLoading ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        {t('dashboard.whatsapp.loading')}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('dashboard.whatsapp.retry')}
                      </>
                    )}
                  </Button>
                </div>
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
          <CardTitle>{t('dashboard.subscription.currentPlan')}</CardTitle>
          <CardDescription>{t('dashboard.subscription.manageSubscription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold capitalize">
                {dashboardData?.subscription?.plan || 'Trial'}
              </h3>
              {dashboardData?.subscription?.plan === 'trial' && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {dashboardData?.subscription?.getRemainingTrial} {t('dashboard.subscription.daysRemaining')}
                </p>
              )}
            </div>
            {dashboardData?.subscription?.plan !== 'trial' && (
              <Button
                variant="outline"
                onClick={async () => {
                  const response = await payment.createPortalSession();
                  window.location.href = response.url;
                }}
              >
                {t('dashboard.subscription.manage')}
              </Button>
            )}
          </div>

          {/* Usage Stats */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{t('dashboard.subscription.usage.minutesUsed')}</span>
                <span className="font-medium">
                  {dashboardData?.usage?.transcriptionsCount} {t('dashboard.subscription.usage.transcriptions')}
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
                {dashboardData?.usage?.remainingMinutes?.toFixed(1)} {t('dashboard.subscription.usage.minutesRemaining')} {' '}
                {dashboardData?.subscription?.limits?.minutesPerMonth}
              </p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{t('dashboard.subscription.usage.summariesUsed')}</span>
                <span className="font-medium">
                  {dashboardData?.usage?.summariesCount} {t('dashboard.subscription.usage.summaries')}
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
                {dashboardData?.usage?.remainingSummaries} {t('dashboard.subscription.usage.summariesRemaining')} {' '}
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
                    <span className="text-gray-600 dark:text-gray-400">/{t('dashboard.subscription.month')}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {plan.limits.minutesPerMonth / 60} {t('dashboard.subscription.features.hoursTranscription')}
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {plan.limits.summariesPerMonth} {t('dashboard.subscription.features.summaries')}
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {t('dashboard.subscription.features.audioUpTo', { minutes: plan.limits.maxAudioDuration / 60 })}
                  </li>
                  {plan.features?.multiLanguage && (
                    <li className="flex items-center text-sm">
                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      {t('dashboard.subscription.features.multiLanguage')}
                    </li>
                  )}
                  {plan.features?.priority && (
                    <li className="flex items-center text-sm">
                      <Star className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                      {t('dashboard.subscription.features.priorityProcessing')}
                    </li>
                  )}
                </ul>

                <Button
                  className="w-full"
                  disabled={isCurrentPlan}
                  onClick={async () => {
                    const response = await payment.createCheckoutSession(planKey);
                    window.location.href = response.url;
                  }}
                >
                  {isCurrentPlan ? t('dashboard.subscription.currentPlan') : t('dashboard.subscription.choosePlan')}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.settings.title')}</CardTitle>
          <CardDescription>{t('dashboard.settings.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="space-y-6"
          >
            {/* Language Settings */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('dashboard.settings.defaultTranscriptionLanguage')}
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
                <option value="auto">{t('dashboard.settings.languages.auto')}</option>
                <option value="fr">{t('dashboard.settings.languages.fr')}</option>
                <option value="en">{t('dashboard.settings.languages.en')}</option>
                <option value="es">{t('dashboard.settings.languages.es')}</option>
                <option value="de">{t('dashboard.settings.languages.de')}</option>
                <option value="it">{t('dashboard.settings.languages.it')}</option>
                <option value="pt">{t('dashboard.settings.languages.pt')}</option>
                <option value="nl">{t('dashboard.settings.languages.nl')}</option>
                <option value="pl">{t('dashboard.settings.languages.pl')}</option>
                <option value="ru">{t('dashboard.settings.languages.ru')}</option>
                <option value="ja">{t('dashboard.settings.languages.ja')}</option>
                <option value="ko">{t('dashboard.settings.languages.ko')}</option>
                <option value="zh">{t('dashboard.settings.languages.zh')}</option>
              </select>
            </div>

            {/* Summary Level Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('dashboard.settings.summaryLevel')}
              </label>
              <SummaryLevelSelector
                value={dashboardData?.settings?.summaryLevel || 'concise'}
                onChange={(level) =>
                  queryClient.setQueryData(['dashboard'], (old) => ({
                    ...old,
                    settings: { ...old.settings, summaryLevel: level }
                  }))
                }
                disabled={dashboardData?.subscription?.plan === 'trial'}
              />
              {dashboardData?.subscription?.plan === 'trial' && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t('dashboard.settings.summaryProOnly')}
                </p>
              )}
            </div>

            {/* Summary Language */}
            {dashboardData?.settings?.summaryLevel !== 'none' && dashboardData?.subscription?.plan !== 'trial' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('dashboard.settings.summaryLanguage')}
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
                  <option value="same">{t('dashboard.settings.sameAsTranscription')}</option>
                  <option value="fr">{t('dashboard.settings.languages.fr')}</option>
                  <option value="en">{t('dashboard.settings.languages.en')}</option>
                  <option value="es">{t('dashboard.settings.languages.es')}</option>
                  <option value="de">{t('dashboard.settings.languages.de')}</option>
                  <option value="it">{t('dashboard.settings.languages.it')}</option>
                  <option value="pt">{t('dashboard.settings.languages.pt')}</option>
                </select>
              </div>
            )}

            {/* Separate Conversation Toggle */}
            <div className="border-t pt-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={dashboardData?.settings?.separateConversation || false}
                    onChange={(e) =>
                      queryClient.setQueryData(['dashboard'], (old) => ({
                        ...old,
                        settings: { ...old.settings, separateConversation: e.target.checked }
                      }))
                    }
                    disabled={dashboardData?.subscription?.plan === 'trial'}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
                  />
                </div>
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('dashboard.settings.separateConversation')}
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('dashboard.settings.separateConversationDescription')}
                  </p>
                  {dashboardData?.subscription?.plan === 'trial' && (
                    <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
                      {t('dashboard.settings.separateConversationProOnly')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Auto-transcribe Toggle */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={dashboardData?.settings?.autoTranscribe !== false}
                  onChange={(e) =>
                    queryClient.setQueryData(['dashboard'], (old) => ({
                      ...old,
                      settings: { ...old.settings, autoTranscribe: e.target.checked }
                    }))
                  }
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('dashboard.settings.autoTranscribe')}
                </span>
              </label>
            </div>

            {/* Notification Preferences */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('dashboard.settings.notifications')}
              </h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={dashboardData?.settings?.notificationPreferences?.email !== false}
                    onChange={(e) =>
                      queryClient.setQueryData(['dashboard'], (old) => ({
                        ...old,
                        settings: {
                          ...old.settings,
                          notificationPreferences: {
                            ...old.settings?.notificationPreferences,
                            email: e.target.checked
                          }
                        }
                      }))
                    }
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {t('dashboard.settings.emailNotifications')}
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={dashboardData?.settings?.notificationPreferences?.usageAlerts !== false}
                    onChange={(e) =>
                      queryClient.setQueryData(['dashboard'], (old) => ({
                        ...old,
                        settings: {
                          ...old.settings,
                          notificationPreferences: {
                            ...old.settings?.notificationPreferences,
                            usageAlerts: e.target.checked
                          }
                        }
                      }))
                    }
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {t('dashboard.settings.usageAlerts')}
                  </span>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <Button
                onClick={() => updateSettingsMutation.mutate(dashboardData?.settings)}
                disabled={updateSettingsMutation.isLoading}
              >
                {updateSettingsMutation.isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    {t('dashboard.settings.saving')}
                  </>
                ) : (
                  t('dashboard.settings.save')
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pro Features Preview */}
      {dashboardData?.subscription?.plan === 'trial' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.settings.proFeatures')}</CardTitle>
            <CardDescription>{t('dashboard.settings.proFeaturesDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {t('dashboard.settings.proFeature1Title')}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('dashboard.settings.proFeature1Description')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
                  <Zap className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {t('dashboard.settings.proFeature2Title')}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('dashboard.settings.proFeature2Description')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
                  <Languages className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {t('dashboard.settings.proFeature3Title')}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('dashboard.settings.proFeature3Description')}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <Button
                onClick={async () => {
                  const response = await payment.createCheckoutSession('pro');
                  window.location.href = response.url;
                }}
                className="w-full"
              >
                {t('dashboard.settings.upgradeToPro')}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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
                        <span className="font-medium">{t(item.label)}</span>
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
                        {t('dashboard.sidebar.plan')} {dashboardData?.subscription?.plan || 'trial'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <LanguageSelector />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => logoutMutation.mutate()}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('dashboard.sidebar.logout')}
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
        title={t('dashboard.transcriptions.details')}
        className="max-w-3xl"
      >
        {selectedTranscript && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard.transcriptions.information')}</h4>
              <div className="mt-2 space-y-2">
                <p className="text-sm">
                  <span className="font-medium">{t('dashboard.transcriptions.phoneNumber')}:</span> {selectedTranscript.metadata?.fromNumber || 'Unknown'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{t('dashboard.transcriptions.date')}:</span>{' '}
                  {formatDate(selectedTranscript.createdAt, 'dd MMMM yyyy à HH:mm')}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{t('dashboard.transcriptions.duration')}:</span> {selectedTranscript.audioLength} {t('dashboard.transcriptions.seconds')}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{t('dashboard.transcriptions.language')}:</span> {selectedTranscript.language}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('dashboard.transcriptions.transcription')}
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
                  {t('dashboard.transcriptions.summary')}
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
                  toast.success(t('dashboard.transcriptions.copied'));
                }}
              >
                {t('dashboard.transcriptions.copyText')}
              </Button>
              <Button onClick={() => setSelectedTranscript(null)}>
                {t('dashboard.transcriptions.close')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
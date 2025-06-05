import axios from 'axios';

// Configuration de l'URL de base selon l'environnement
const getApiBaseUrl = () => {
  // En développement, utiliser une URL relative pour le proxy
  if (import.meta.env.MODE === 'development') {
    return ''; // Pas de base URL, utiliser des URLs relatives
  }
  
  // En production, utiliser l'URL de l'API ou une URL relative
  return import.meta.env.VITE_API_URL || '';
};

const API_BASE_URL = getApiBaseUrl();

console.log('Environment:', import.meta.env.MODE);
console.log('API Base URL:', API_BASE_URL || 'Using relative URLs');

// Créer l'instance axios
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000, // 30 secondes
});

// Variable pour stocker le token CSRF
let csrfToken = null;
let csrfPromise = null;

// Fonction pour obtenir le token CSRF
const getCSRFToken = async () => {
  if (csrfToken) {
    return csrfToken;
  }

  // Si une requête est déjà en cours, attendre son résultat
  if (csrfPromise) {
    return csrfPromise;
  }

  // Créer une nouvelle promesse pour éviter les requêtes multiples
  csrfPromise = (async () => {
    try {
      // Utiliser une URL relative
      const response = await axios.get('/api/csrf-token', { 
        withCredentials: true,
        timeout: 5000
      });
      csrfToken = response.data.csrfToken;
      console.log('CSRF token obtained:', csrfToken ? 'yes' : 'no');
      return csrfToken;
    } catch (error) {
      console.error('Failed to get CSRF token:', error.message);
      // En dev, on continue sans CSRF
      if (import.meta.env.MODE === 'development') {
        csrfToken = 'dev-csrf-token';
        return csrfToken;
      }
      return null;
    } finally {
      csrfPromise = null;
    }
  })();

  return csrfPromise;
};

// Intercepteur pour ajouter le token CSRF aux requêtes
api.interceptors.request.use(
  async (config) => {
    // S'assurer que l'URL commence par /api
    if (!config.url.startsWith('/api')) {
      config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
    }
    
    // Log pour debug
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    
    // Ajouter le token CSRF pour les requêtes qui modifient des données
    if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
      const token = await getCSRFToken();
      if (token) {
        config.headers['X-CSRF-Token'] = token;
      }
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et erreurs
api.interceptors.response.use(
  response => {
    console.log(`[API] Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async error => {
    const originalRequest = error.config;
    
    console.error('[API] Error:', {
      url: originalRequest?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
    // Gestion du 401 (non authentifié)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Ne pas rediriger si on est déjà sur la page de login
      if (!window.location.pathname.includes('/login') && 
          !originalRequest.url.includes('/auth/status')) {
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    
    // Gestion du 403 CSRF
    if (error.response?.status === 403 && 
        error.response?.data?.error?.includes('CSRF') && 
        !originalRequest._retryCSRF) {
      console.log('CSRF error detected, retrying with new token...');
      originalRequest._retryCSRF = true;
      
      // Réinitialiser le token CSRF
      csrfToken = null;
      
      // Obtenir un nouveau token
      const token = await getCSRFToken();
      if (token) {
        originalRequest.headers['X-CSRF-Token'] = token;
        return api(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);

// API endpoints - utiliser des chemins relatifs sans /api car il sera ajouté par l'intercepteur
export const auth = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  status: async () => {
    const response = await api.get('/auth/status');
    return response.data;
  }
};

export const users = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.patch('/users/profile', data);
    return response.data;
  },

  getWhatsAppStatus: async () => {
    const response = await api.get('/users/whatsapp-status');
    return response.data;
  },

  whatsappLogout: async () => {
    const response = await api.post('/users/whatsapp-logout');
    return response.data;
  }
};

export const transcripts = {
  getAll: async (params = {}) => {
    const response = await api.get('/transcripts', { params });
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.get(`/transcripts/${id}`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/transcripts/${id}`);
    return response.data;
  },

  getWhatsAppQR: async () => {
    const response = await api.get('/transcripts/whatsapp-qr');
    return response.data;
  },

  getWhatsAppStatus: async () => {
    const response = await api.get('/transcripts/whatsapp-status');
    return response.data;
  },

  transcribe: async (data) => {
    const response = await api.post('/transcripts/transcribe', data);
    return response.data;
  },

  getJobStatus: async (jobId) => {
    const response = await api.get(`/transcripts/job/${jobId}`);
    return response.data;
  }
};

export const payment = {
  getSubscription: async () => {
    const response = await api.get('/payment/subscription');
    return response.data;
  },

  createCheckoutSession: async (planId) => {
    const response = await api.post('/payment/create-checkout-session', { planId });
    return response.data;
  },

  createPortalSession: async () => {
    const response = await api.post('/payment/create-portal-session');
    return response.data;
  },

  cancelSubscription: async (immediately = false) => {
    const response = await api.post('/payment/cancel-subscription', { immediately });
    return response.data;
  },

  getUsageHistory: async (months = 6) => {
    const response = await api.get('/payment/usage-history', { params: { months } });
    return response.data;
  }
};

// Export default de l'instance axios pour les cas spéciaux
export default api;
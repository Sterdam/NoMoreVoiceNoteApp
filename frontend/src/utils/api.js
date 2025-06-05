import axios from 'axios';

// Configuration de l'URL de base selon l'environnement
const getApiBaseUrl = () => {
  // En développement, on utilise le proxy de Vite
  if (import.meta.env.MODE === 'development') {
    // Important: pas de domaine complet, juste /api pour utiliser le proxy
    return '/api';
  }
  
  // En production
  return import.meta.env.VITE_API_URL || '/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log('API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000 // 30 secondes
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
      const response = await axios.get(`${API_BASE_URL}/csrf-token`, { 
        withCredentials: true,
        timeout: 5000
      });
      csrfToken = response.data.csrfToken;
      return csrfToken;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
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
    // Log pour debug
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Ajouter le token CSRF pour les requêtes qui modifient des données
    if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
      const token = await getCSRFToken();
      if (token) {
        config.headers['X-CSRF-Token'] = token;
      }
    }
    
    // S'assurer que l'URL est correcte
    if (config.url && !config.url.startsWith('http')) {
      // Si l'URL ne commence pas par http, c'est une URL relative
      config.url = config.url.startsWith('/') ? config.url : `/${config.url}`;
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
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async error => {
    console.error('API Error:', error.config?.url, error.response?.status, error.message);
    
    if (error.response?.status === 401) {
      // Ne pas rediriger si on est déjà sur la page de login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403 && error.response?.data?.error?.includes('CSRF')) {
      // Réessayer avec un nouveau token CSRF
      csrfToken = null;
      const originalRequest = error.config;
      
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        
        const token = await getCSRFToken();
        if (token) {
          originalRequest.headers['X-CSRF-Token'] = token;
          return api(originalRequest);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
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

export default api;
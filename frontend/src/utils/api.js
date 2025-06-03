import axios from 'axios';

// Déterminer l'URL du backend selon l'environnement
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000/api'  // Backend en développement
  : '/api';  // En production, utiliser le proxy

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Variable pour stocker le token CSRF
let csrfToken = null;

// Fonction pour obtenir le token CSRF
const getCSRFToken = async () => {
  if (!csrfToken) {
    try {
      // Utiliser la même base URL pour le token CSRF
      const response = await axios.get(`${API_BASE_URL}/csrf-token`, { withCredentials: true });
      csrfToken = response.data.csrfToken;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
    }
  }
  return csrfToken;
};

// Intercepteur pour ajouter le token CSRF aux requêtes
api.interceptors.request.use(
  async (config) => {
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
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Rediriger vers la page de connexion si non authentifié
      window.location.href = '/login';
    } else if (error.response?.status === 403 && error.response?.data?.error?.includes('CSRF')) {
      // Réessayer avec un nouveau token CSRF
      csrfToken = null;
      const originalRequest = error.config;
      originalRequest._retry = true;
      
      const token = await getCSRFToken();
      if (token) {
        originalRequest.headers['X-CSRF-Token'] = token;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erreur de connexion');
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erreur d\'inscription');
    }
  },

  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erreur de déconnexion');
    }
  }
};

export const users = {
  getProfile: async () => {
    try {
      const response = await api.get('/users/profile');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erreur de profil');
    }
  }
};

export default api;
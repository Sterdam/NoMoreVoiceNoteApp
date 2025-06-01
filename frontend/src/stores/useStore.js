import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-storage',
    }
  )
);

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  
  login: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  updateUser: (user) => set({ user }),
}));

export const useTranscriptStore = create((set) => ({
  transcripts: [],
  loading: false,
  error: null,
  
  setTranscripts: (transcripts) => set({ transcripts }),
  addTranscript: (transcript) => set((state) => ({ 
    transcripts: [transcript, ...state.transcripts] 
  })),
  updateTranscript: (id, updates) => set((state) => ({
    transcripts: state.transcripts.map(t => t._id === id ? { ...t, ...updates } : t)
  })),
  deleteTranscript: (id) => set((state) => ({
    transcripts: state.transcripts.filter(t => t._id !== id)
  })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
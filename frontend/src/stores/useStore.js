// frontend/src/stores/useStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Theme store with persistence
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Auth store - without persistence for security
export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  
  login: (user, token) => {
    console.log('Auth store login:', { user, token });
    set({ 
      user, 
      token, 
      isAuthenticated: true 
    });
  },
  
  logout: () => {
    console.log('Auth store logout');
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false 
    });
  },
  
  updateUser: (user) => set({ user }),
  
  checkAuth: () => {
    const state = get();
    return state.isAuthenticated && state.user !== null;
  }
}));

// Transcript store
export const useTranscriptStore = create((set) => ({
  transcripts: [],
  loading: false,
  error: null,
  selectedTranscript: null,
  
  setTranscripts: (transcripts) => set({ transcripts }),
  
  addTranscript: (transcript) => set((state) => ({ 
    transcripts: [transcript, ...state.transcripts] 
  })),
  
  updateTranscript: (id, updates) => set((state) => ({
    transcripts: state.transcripts.map(t => 
      t._id === id ? { ...t, ...updates } : t
    )
  })),
  
  deleteTranscript: (id) => set((state) => ({
    transcripts: state.transcripts.filter(t => t._id !== id)
  })),
  
  setSelectedTranscript: (transcript) => set({ selectedTranscript: transcript }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null })
}));

// UI store for managing UI state
export const useUIStore = create((set) => ({
  sidebarOpen: false,
  mobileMenuOpen: false,
  activeModal: null,
  toasts: [],
  
  toggleSidebar: () => set((state) => ({ 
    sidebarOpen: !state.sidebarOpen 
  })),
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  toggleMobileMenu: () => set((state) => ({ 
    mobileMenuOpen: !state.mobileMenuOpen 
  })),
  
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  
  openModal: (modalName) => set({ activeModal: modalName }),
  
  closeModal: () => set({ activeModal: null }),
  
  addToast: (toast) => set((state) => ({
    toasts: [...state.toasts, { 
      id: Date.now(), 
      ...toast 
    }]
  })),
  
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  }))
}));

// Settings store with persistence
export const useSettingsStore = create(
  persist(
    (set) => ({
      language: 'fr',
      transcriptionLanguage: 'auto',
      summaryLevel: 'concise',
      summaryLanguage: 'same',
      autoTranscribe: true,
      separateConversation: false,
      notifications: {
        email: true,
        whatsapp: true,
        usageAlerts: true
      },
      
      updateSettings: (updates) => set((state) => ({
        ...state,
        ...updates
      })),
      
      updateNotifications: (notifications) => set((state) => ({
        notifications: {
          ...state.notifications,
          ...notifications
        }
      }))
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
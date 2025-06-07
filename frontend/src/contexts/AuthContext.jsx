// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '../stores/useStore';
import { auth as authApi } from '../utils/api';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { login: storeLogin, logout: storeLogout } = useAuthStore();

  // Check auth status on mount and when needed
  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authApi.status();
      
      if (response.success && response.user) {
        setUser(response.user);
        storeLogin(response.user, 'token-from-cookie');
      } else {
        setUser(null);
        storeLogout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      storeLogout();
    } finally {
      setLoading(false);
    }
  }, [storeLogin, storeLogout]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (email, password) => {
    try {
      const response = await authApi.login({ email, password });
      
      if (response.success && response.user) {
        setUser(response.user);
        storeLogin(response.user, response.token);
        
        // Force a small delay to ensure cookies are set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return response;
      }
      
      throw new Error('Login failed');
    } catch (error) {
      console.error('Login error in context:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await authApi.register(userData);
      
      if (response.success && response.user) {
        setUser(response.user);
        storeLogin(response.user, response.token);
        
        // Force a small delay to ensure cookies are set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return response;
      }
      
      throw new Error('Registration failed');
    } catch (error) {
      console.error('Register error in context:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      storeLogout();
      // Force redirect to login
      window.location.href = '/login';
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
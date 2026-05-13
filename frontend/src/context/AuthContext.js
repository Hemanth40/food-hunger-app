import React, { createContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { decode } from 'base-64';

import client from '../api/client';

global.atob = global.atob || decode;

export const AuthContext = createContext();

const secureSet = async (key, value) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
};

const secureGet = async (key) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
};

const secureDelete = async (key) => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    hydrateSession();
  }, []);

  const refreshUser = async () => {
    const response = await client.get('/auth/me');
    setUser(response.data);
    return response.data;
  };

  const hydrateSession = async () => {
    try {
      const token = await secureGet('access_token');
      if (token) {
        await refreshUser();
      }
    } catch (error) {
      await secureDelete('access_token');
      await secureDelete('refresh_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phone, password) => {
    const response = await client.post('/auth/login', { phone, password });
    const { access_token, refresh_token, user: nextUser } = response.data;
    await secureSet('access_token', access_token);
    await secureSet('refresh_token', refresh_token);
    setUser(nextUser);
    return nextUser;
  };

  const verifyOTP = async (phone, firebaseIdToken) => {
    // firebaseIdToken: Firebase Phone Auth ID token (or DEV_OTP in dev mode)
    const response = await client.post('/auth/verify-otp', {
      phone,
      firebase_id_token: firebaseIdToken,
    });
    const { access_token, refresh_token, user: nextUser } = response.data;
    await secureSet('access_token', access_token);
    await secureSet('refresh_token', refresh_token);
    setUser(nextUser);
    return nextUser;
  };

  const register = async (payload) => {
    const response = await client.post('/auth/register', payload);
    return response.data; // Returns { phone, message, otp_hint }
  };

  const updateProfile = async (patch) => {
    const response = await client.put('/auth/me', patch);
    setUser(response.data);
    return response.data;
  };

  const logout = async () => {
    try {
      const refreshToken = await secureGet('refresh_token');
      if (refreshToken) {
        await client.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch (error) {
      // Local cleanup still happens below.
    } finally {
      await secureDelete('access_token');
      await secureDelete('refresh_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        verifyOTP,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

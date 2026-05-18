import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Backend is deployed on Render — works from anywhere, any network!
const RENDER_URL = 'https://food-hunger-backend.onrender.com/api';

const configuredRoot = process.env.EXPO_PUBLIC_API_URL || RENDER_URL;
const baseURL = configuredRoot.endsWith('/api') ? configuredRoot : `${configuredRoot}/api`;

console.log('[API] baseURL =', baseURL);

const client = axios.create({
  baseURL,
  timeout: 60000, // 60s timeout to allow Render free tier to wake up (cold start)
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(
  async (config) => {
    const token =
      Platform.OS === 'web'
        ? localStorage.getItem('access_token')
        : await SecureStore.getItemAsync('access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === 'ECONNABORTED' || !error.response) {
      console.error('[API] Network error or timeout — backend may be waking up (cold start), retry in 30s', error.message);
    } else {
      console.error('[API] Error details:', error.response?.status, error.response?.data);
    }
    return Promise.reject(error);
  }
);

export default client;

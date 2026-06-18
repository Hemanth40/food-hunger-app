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
  timeout: 90000, // 90s timeout to allow Render free tier to fully wake up (cold start)
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor: attach auth token ───────────────────────────────────
client.interceptors.request.use(
  async (config) => {
    const token =
      Platform.OS === 'web'
        ? localStorage.getItem('access_token')
        : await SecureStore.getItemAsync('access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Track retry count on config object
    config._retryCount = config._retryCount || 0;

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: auto-retry on cold start / network errors ──────────
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds between retries

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Detect cold-start / network error (no response received at all)
    const isColdStart = error.code === 'ECONNABORTED' || !error.response;

    if (isColdStart && config && config._retryCount < MAX_RETRIES) {
      config._retryCount += 1;
      console.log(
        `[API] Backend waking up (cold start) — retry ${config._retryCount}/${MAX_RETRIES} in ${RETRY_DELAY_MS / 1000}s...`
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

      return client(config); // retry the request
    }

    // Give up after max retries or if it's a real API error
    if (isColdStart) {
      console.error(
        '[API] Backend did not respond after all retries. Check https://food-hunger-backend.onrender.com/api/health'
      );
    } else {
      console.error('[API] Error:', error.response?.status, error.response?.data);
    }

    return Promise.reject(error);
  }
);

export default client;

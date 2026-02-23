/**
 * Application configuration
 * Environment variables are loaded from .env files via Expo
 */

// API configuration
export const API_BASE_URL = __DEV__
  ? process.env.EXPO_PUBLIC_API_BASE_URL_DEV
  : process.env.EXPO_PUBLIC_API_BASE_URL_PROD;

/**
 * Application configuration
 * Environment variables are loaded from .env files via Expo
 */

// API configuration
export const API_BASE_URL = __DEV__
  ? process.env.EXPO_PUBLIC_API_BASE_URL_DEV
  : process.env.EXPO_PUBLIC_API_BASE_URL_PROD;

// Dev mode: Apple User ID used for automatic dev token login (bypasses Apple Sign In)
export const DEV_APPLE_USER_ID = process.env.EXPO_PUBLIC_DEV_APPLE_USER_ID;

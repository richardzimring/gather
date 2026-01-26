/**
 * Application configuration
 * Environment variables are loaded from .env files via Expo
 */

// API configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.gather.example.com'

import axios from 'axios';
import { supabase } from './supabase';

// Use relative URL in production (Vercel), or explicit URL in development
const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' ? '' : 'http://localhost:3001');

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.error('Error getting session for API request:', error);
  }
  
  return config;
});

export default api;


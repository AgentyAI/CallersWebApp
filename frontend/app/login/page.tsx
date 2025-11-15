'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Sign in existing user
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        // Provide user-friendly error messages
        if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.includes('Email rate limit exceeded')) {
          setError('Too many login attempts. Please try again later.');
        } else {
          setError(error.message || 'Failed to login. Please check your credentials.');
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        // Wait a moment for session to be stored
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          // Fetch user role using the API client
          const response = await api.get('/auth/me');
          const user = response.data;
          console.log('User authenticated:', user);
          
          // Use window.location for a full page reload to ensure session is recognized
          if (user.role === 'admin') {
            window.location.href = '/admin';
          } else {
            window.location.href = '/leads';
          }
        } catch (apiError: any) {
          console.error('API error:', apiError);
          
          // Check if it's a network error
          if (apiError.code === 'ERR_NETWORK' || apiError.message?.includes('Failed to fetch')) {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            setError(`Cannot connect to backend server. Please ensure the backend is running at ${apiUrl}`);
          } else if (apiError.response) {
            // Server responded with error
            const status = apiError.response.status;
            const errorText = apiError.response.data?.error || apiError.response.statusText || 'Unknown error';
            setError(`Authentication failed (${status}): ${errorText}`);
          } else {
            setError(`Failed to authenticate: ${apiError.message || 'Unknown error'}`);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cold Caller</h1>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        if (pathname !== '/login') {
          router.push('/login');
        }
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch (error: any) {
        console.error('Auth check error:', error);
        // Only redirect if we're not already on login page
        if (pathname !== '/login') {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && pathname !== '/login') {
        router.push('/login');
      } else if (session) {
        // Re-check auth when session changes
        checkAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isLeadsPage = pathname?.startsWith('/leads');
  const isAdminPage = pathname?.startsWith('/admin');

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-blue-600">Cold Caller</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {!isAdmin && (
                  <a
                    href="/leads"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isLeadsPage
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Leads
                  </a>
                )}
                {isAdmin && (
                  <a
                    href="/admin"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isAdminPage
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Dashboard
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}


'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';
import Link from 'next/link';
import { ChevronDown, LogOut } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, isLoading, userEmail, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-100 flex flex-col items-center justify-center px-4 page-transition animate-fade-in">
      {/* Header */}
      <div className="absolute top-8 right-8 flex items-center gap-4">
        <span className="text-gray-600">Welcome, {userEmail}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-all duration-300"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-6xl font-bold text-teal-900 mb-6 animate-fade-in-up">
          Trialytics
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto animate-fade-in-up animation-delay-200"> 
          Streamline your research workflow with intelligent automation and data analysis.
        </p>
        
        <div className="flex justify-center animate-fade-in-up animation-delay-600">
          <Link 
            href="/trials"
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-8 py-4 rounded-lg hover:bg-teal-700 transition-all duration-300 text-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transform"
          >
            Manage Clinical Trials
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </Link>
        </div>
      </div>
    </div>
  );
}
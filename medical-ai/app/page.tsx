'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-100 flex flex-col items-center justify-center px-4 page-transition">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-6xl font-bold text-teal-900 mb-6 animate-fade-in-up">
          Trial Run
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto animate-fade-in-up animation-delay-200"> 
          Streamline your research workflow with intelligent automation and data analysis.
        </p>
        
        <div className="flex justify-center animate-fade-in-up animation-delay-600">
          <Link 
            href="/trials"
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-8 py-4 rounded-lg hover:bg-teal-700 transition-all duration-300 text-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transform"
          >
            Explore Clinical Trials
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </Link>
        </div>
      </div>
    </div>
  );
}
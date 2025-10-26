'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-6xl font-bold text-gray-900 mb-6">
          Medical AI Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Advanced AI-powered solutions for clinical trials and medical research. 
          Streamline your research workflow with intelligent automation and data analysis.
        </p>
        <p className="text-lg text-gray-500 mb-12 max-w-xl mx-auto">
          Discover cutting-edge clinical trials and leverage AI to accelerate your medical research.
        </p>
        
        <div className="flex justify-center">
          <Link 
            href="/trials"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium shadow-lg hover:shadow-xl"
          >
            Explore Clinical Trials
            <ChevronDown className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
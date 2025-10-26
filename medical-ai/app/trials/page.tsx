'use client';

import Link from 'next/link';
import { ArrowUp, MessageCircle } from 'lucide-react';

const clinicalTrials = [
  {
    id: 1,
    title: "COVID-19 Clinical Trial",
    description: "Investigating novel therapeutic approaches for COVID-19 treatment and prevention strategies.",
    phase: "Phase III",
    participants: "2,500+",
    duration: "18 months"
  },
  {
    id: 2,
    title: "AIDS Clinical Trial",
    description: "Advanced HIV/AIDS treatment protocols and vaccine development research.",
    phase: "Phase II",
    participants: "1,200+",
    duration: "24 months"
  }
];

export default function TrialsPage() {
  return (
    <div className="min-h-screen bg-gray-50 page-transition">
      {/* Header */}
      <header className="bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <h1 className="text-5xl font-bold text-teal-900">Clinical Trials.</h1>
          <Link 
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-all duration-300 smooth-hover"
          >
            <ArrowUp className="w-4 h-4" />
            Home
          </Link>
        </div>
      </header>

      {/* Trial Cards Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clinicalTrials.map((trial) => (
            <div 
              key={trial.id} 
              className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 smooth-hover card-enter animate-scale-in"
            >
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{trial.title}</h3>
              </div>
              
              <p className="text-gray-600 mb-4">{trial.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <span className="text-gray-500">Phase:</span>
                  <span className="ml-1 font-medium text-gray-900">{trial.phase}</span>
                </div>
                <div>
                  <span className="text-gray-500">Participants:</span>
                  <span className="ml-1 font-medium text-gray-900">{trial.participants}</span>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <span className="ml-1 font-medium text-gray-900">{trial.duration}</span>
                </div>
              </div>
              
                     <Link 
                       href="/code-stream"
                       className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                     >
                <MessageCircle className="w-4 h-4" />
                Continue Chat
              </Link>
            </div>
          ))}
          
                 {/* Add New Trial Placeholder */}
                 <Link href="/code-stream">
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center hover:border-gray-400 transition-all duration-300 smooth-hover cursor-pointer animate-scale-in">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-gray-500">+</span>
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Add New Trial</h3>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

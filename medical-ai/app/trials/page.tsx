'use client';

import Link from 'next/link';
import { ArrowLeft, MessageCircle } from 'lucide-react';

const clinicalTrials = [
  {
    id: 1,
    title: "COVID-19 Clinical Trial",
    description: "Investigating novel therapeutic approaches for COVID-19 treatment and prevention strategies.",
    phase: "Phase III",
    status: "Active",
    participants: "2,500+",
    duration: "18 months"
  },
  {
    id: 2,
    title: "AIDS Clinical Trial",
    description: "Advanced HIV/AIDS treatment protocols and vaccine development research.",
    phase: "Phase II",
    status: "Recruiting",
    participants: "1,200+",
    duration: "24 months"
  },
  {
    id: 3,
    title: "Cancer Immunotherapy Trial",
    description: "Revolutionary CAR-T cell therapy for various cancer types and treatment resistance.",
    phase: "Phase I",
    status: "Active",
    participants: "800+",
    duration: "36 months"
  },
  {
    id: 4,
    title: "Alzheimer's Disease Study",
    description: "Novel biomarkers and therapeutic interventions for early-stage Alzheimer's disease.",
    phase: "Phase II",
    status: "Recruiting",
    participants: "1,500+",
    duration: "30 months"
  },
  {
    id: 5,
    title: "Diabetes Management Trial",
    description: "AI-powered glucose monitoring and personalized treatment optimization.",
    phase: "Phase III",
    status: "Active",
    participants: "3,000+",
    duration: "12 months"
  },
  {
    id: 6,
    title: "Mental Health Intervention",
    description: "Digital therapeutics and AI-assisted mental health treatment protocols.",
    phase: "Phase II",
    status: "Recruiting",
    participants: "900+",
    duration: "18 months"
  }
];

export default function TrialsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <Link 
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Clinical Trials</h1>
          <div></div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Active Clinical Trials
          </h2>
          <p className="text-lg text-gray-600">
            Explore our comprehensive portfolio of clinical trials and research studies.
          </p>
        </div>

        {/* Trial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clinicalTrials.map((trial) => (
            <div key={trial.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{trial.title}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  trial.status === 'Active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {trial.status}
                </span>
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
                href="/chat"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <MessageCircle className="w-4 h-4" />
                Start Chat
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

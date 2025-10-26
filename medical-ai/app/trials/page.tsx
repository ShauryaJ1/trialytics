'use client';

import Link from 'next/link';
import { ArrowUp, MessageCircle, Plus, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Trial {
  id: string;
  title: string;
  phase: string;
  participants: string;
  duration: string;
  chatId: string;
  createdAt: Date;
}

export default function TrialsPage() {
  const router = useRouter();
  const [trials, setTrials] = useState<Trial[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newTrial, setNewTrial] = useState({
    title: '',
    phase: 'Phase I',
    participants: '',
    duration: ''
  });

  // Load trials from localStorage on component mount
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const savedTrials = localStorage.getItem('clinicalTrials');
    if (savedTrials) {
      try {
        const parsedTrials = JSON.parse(savedTrials);
        // Convert createdAt strings back to Date objects
        const trialsWithDates = parsedTrials.map((trial: any) => ({
          ...trial,
          createdAt: new Date(trial.createdAt)
        }));
        setTrials(trialsWithDates);
      } catch (error) {
        console.error('Error parsing saved trials:', error);
        initializeDefaultTrials();
      }
    } else {
      initializeDefaultTrials();
    }
    setIsLoading(false);
  }, []);

  const initializeDefaultTrials = () => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const defaultTrials: Trial[] = [
      {
        id: '1',
        title: "COVID-19 Clinical Trial",
        phase: "Phase III",
        participants: "2,500+",
        duration: "18 months",
        chatId: crypto.randomUUID(),
        createdAt: new Date()
      },
      {
        id: '2',
        title: "AIDS Clinical Trial",
        phase: "Phase II",
        participants: "1,200+",
        duration: "24 months",
        chatId: crypto.randomUUID(),
        createdAt: new Date()
      }
    ];
    setTrials(defaultTrials);
    localStorage.setItem('clinicalTrials', JSON.stringify(defaultTrials));
  };

  // Save trials to localStorage whenever trials change
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    if (trials.length > 0) {
      localStorage.setItem('clinicalTrials', JSON.stringify(trials));
    }
  }, [trials]);

  const handleAddTrial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrial.title.trim()) return;

    const trial: Trial = {
      id: crypto.randomUUID(),
      title: newTrial.title,
      phase: newTrial.phase,
      participants: newTrial.participants || 'TBD',
      duration: newTrial.duration || 'TBD',
      chatId: crypto.randomUUID(),
      createdAt: new Date()
    };

    setTrials(prev => [...prev, trial]);
    setNewTrial({ title: '', phase: 'Phase I', participants: '', duration: '' });
    setShowAddForm(false);
    
    // Navigate to the chat page for the new trial
    router.push(`/code-stream?chatId=${trial.chatId}`);
  };

  const handleDeleteTrial = (id: string) => {
    setTrials(prev => prev.filter(trial => trial.id !== id));
  };
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
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading trials...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trials.map((trial) => (
            <div 
              key={trial.id} 
              className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 smooth-hover card-enter animate-scale-in relative group"
            >
              {/* Delete button */}
              <button
                onClick={() => handleDeleteTrial(trial.id)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete trial"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900 pr-8">{trial.title}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Created {trial.createdAt.toLocaleDateString()}
                </p>
              </div>
              
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
                href={`/code-stream?chatId=${trial.chatId}`}
                className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
              >
                <MessageCircle className="w-4 h-4" />
                Continue Chat
              </Link>
            </div>
          ))}
          
          {/* Add New Trial Form or Button */}
          {showAddForm ? (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 animate-scale-in">
              <form onSubmit={handleAddTrial} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trial Title *
                  </label>
                  <input
                    type="text"
                    value={newTrial.title}
                    onChange={(e) => setNewTrial(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Enter trial title"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phase
                  </label>
                  <select
                    value={newTrial.phase}
                    onChange={(e) => setNewTrial(prev => ({ ...prev, phase: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="Phase I">Phase I</option>
                    <option value="Phase II">Phase II</option>
                    <option value="Phase III">Phase III</option>
                    <option value="Phase IV">Phase IV</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Participants
                  </label>
                  <input
                    type="text"
                    value={newTrial.participants}
                    onChange={(e) => setNewTrial(prev => ({ ...prev, participants: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., 1,000+"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={newTrial.duration}
                    onChange={(e) => setNewTrial(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., 12 months"
                  />
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                  >
                    Add Trial
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center hover:border-gray-400 transition-all duration-300 smooth-hover cursor-pointer animate-scale-in"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-6 h-6 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Add New Trial</h3>
              </div>
            </button>
          )}
          </div>
        )}
      </div>
    </div>
  );
}

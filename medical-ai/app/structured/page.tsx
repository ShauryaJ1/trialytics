'use client';

import { useState } from 'react';

export default function StructuredDataPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'object' | 'tool'>('object');

  // Object generation state
  const [objectPrompt, setObjectPrompt] = useState('Generate a healthy vegetarian pasta recipe for 4 people');

  // Tool calling state
  const [toolPrompt, setToolPrompt] = useState('What is the weather like in Paris, France? Also, calculate 156 divided by 12.');

  const handleGenerateObject = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/generate-object', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: objectPrompt }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate object');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleToolCall = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/tool-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: toolPrompt }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute tool call');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          AI SDK Advanced Features Test
        </h1>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('object')}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === 'object'
                ? 'bg-white text-blue-600 border-t border-l border-r border-gray-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Structured Object Generation
          </button>
          <button
            onClick={() => setActiveTab('tool')}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === 'tool'
                ? 'bg-white text-blue-600 border-t border-l border-r border-gray-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tool Calling
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {activeTab === 'object' ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Generate Structured Recipe</h2>
              <p className="text-gray-600 mb-4">
                This example generates a structured recipe object with a predefined schema.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipe Prompt
                  </label>
                  <textarea
                    value={objectPrompt}
                    onChange={(e) => setObjectPrompt(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Describe the recipe you want to generate..."
                  />
                </div>

                <button
                  onClick={handleGenerateObject}
                  disabled={loading || !objectPrompt.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Generating...' : 'Generate Recipe Object'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-4">Tool Calling Example</h2>
              <p className="text-gray-600 mb-4">
                The model can use weather, calculator, and search tools to answer your questions.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Query (Try asking about weather, math, or general questions)
                  </label>
                  <textarea
                    value={toolPrompt}
                    onChange={(e) => setToolPrompt(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Ask something that requires tools..."
                  />
                </div>

                <button
                  onClick={handleToolCall}
                  disabled={loading || !toolPrompt.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processing...' : 'Execute with Tools'}
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-medium">Error</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Result</h3>
              
              {/* For Object Generation */}
              {activeTab === 'object' && (
                <>
                  {result.object && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">Generated Recipe</h4>
                      <pre className="text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(result.object, null, 2)}
                      </pre>
                    </div>
                  )}
                  {result.rawText && !result.object && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-medium text-yellow-900 mb-2">Raw Model Output (JSON parsing failed)</h4>
                      <pre className="text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">
                        {result.rawText}
                      </pre>
                      {result.error && (
                        <p className="mt-2 text-sm text-yellow-700">{result.error}</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* For Tool Calling */}
              {activeTab === 'tool' && (
                <>
                  {result.text && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Model Response</h4>
                      <p className="text-gray-700">{result.text}</p>
                    </div>
                  )}

                  {result.toolCalls && result.toolCalls.length > 0 && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-2">Tool Calls</h4>
                      <pre className="text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(result.toolCalls, null, 2)}
                      </pre>
                    </div>
                  )}

                  {result.toolResults && result.toolResults.length > 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-medium text-yellow-900 mb-2">Tool Results</h4>
                      <pre className="text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(result.toolResults, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}

              {/* Usage Information */}
              {result.usage && (
                <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Token Usage</h4>
                  <div className="text-sm text-gray-600">
                    <p>Input: {result.usage.inputTokens || 'N/A'}</p>
                    <p>Output: {result.usage.outputTokens || 'N/A'}</p>
                    <p>Total: {result.usage.totalTokens || 'N/A'}</p>
                  </div>
                </div>
              )}

              {/* Finish Reason */}
              {result.finishReason && (
                <div className="text-sm text-gray-500">
                  Finish reason: <span className="font-mono">{result.finishReason}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <a 
            href="/" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Chat
          </a>
        </div>
      </div>
    </div>
  );
}

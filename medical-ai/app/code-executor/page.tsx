'use client';

import { useState, useEffect } from 'react';

export default function CodeExecutor() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [checkingServer, setCheckingServer] = useState(false);

  // Check server status on mount
  useEffect(() => {
    checkServerStatus();
  }, []);

  // Check server status
  const checkServerStatus = async () => {
    setCheckingServer(true);
    try {
      const res = await fetch('/api/execute-code');
      const data = await res.json();
      setServerStatus(data);
    } catch (error) {
      setServerStatus({ available: false, error: 'Failed to check server status' });
    } finally {
      setCheckingServer(false);
    }
  };

  // Execute code with AI assistance
  const executeWithAI = async () => {
    setLoading(true);
    setResponse(null);
    
    try {
      const res = await fetch('/api/execute-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          includeExamples: true 
        }),
      });

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      setResponse({ 
        error: error instanceof Error ? error.message : 'Failed to execute' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Example prompts
  const examplePrompts = [
    "Write and execute Python code to generate a random 5x5 matrix using NumPy and calculate its determinant",
    "Create a pandas DataFrame with sample sales data and calculate the total revenue by category",
    "Write code to fetch the current Bitcoin price from an API and display it",
    "Generate a simple plot showing the sine and cosine functions from 0 to 2π",
    "Create a function that calculates the Fibonacci sequence and execute it for n=10",
  ];

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Code Execution with Modal</h1>
        <p className="text-gray-600 mb-4">
          This interface allows the AI agent to execute Python code in a sandboxed Modal environment.
          The agent has access to tools for executing code, analyzing it, and retrieving examples.
        </p>
        
        {/* Server Status */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Modal Server Status</h3>
              <p className="text-sm text-gray-600">
                {serverStatus?.modalServerUrl || 'Modal Server'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {checkingServer ? (
                <span className="text-gray-500">Checking...</span>
              ) : (
                <>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    serverStatus?.available 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {serverStatus?.available ? '● Online' : '● Offline'}
                  </span>
                  <button
                    onClick={checkServerStatus}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Refresh
                  </button>
                </>
              )}
            </div>
          </div>
          {serverStatus?.health && (
            <div className="mt-2 text-xs text-gray-600">
              <p>Status: {serverStatus.health.status}</p>
              <p>Modal Connected: {serverStatus.health.modal_connected ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>

        {/* Example Prompts */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Example Prompts</h3>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example, index) => (
              <button
                key={index}
                onClick={() => setPrompt(example)}
                className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                {example.substring(0, 50)}...
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="mb-6">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            Enter your prompt for the AI
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Write Python code to calculate the factorial of 10 and execute it"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
          />
        </div>

        {/* Execute Button */}
        <button
          onClick={executeWithAI}
          disabled={loading || !prompt || !serverStatus?.available}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            loading || !prompt || !serverStatus?.available
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? 'Processing...' : 'Execute with AI'}
        </button>
      </div>

      {/* Response Section */}
      {response && (
        <div className="space-y-6">
          {/* AI Response */}
          {response.text && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">AI Response</h3>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm">{response.text}</pre>
              </div>
            </div>
          )}

          {/* Tool Calls */}
          {response.toolCalls && response.toolCalls.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">Tool Calls</h3>
              {response.toolCalls.map((call: any, index: number) => (
                <div key={index} className="mb-4 p-4 bg-gray-50 rounded">
                  <div className="font-medium text-sm mb-2">
                    Tool: {call.toolName || 'Unknown'}
                  </div>
                  <div className="text-xs text-gray-600">
                    <pre>{JSON.stringify(call.args || call, null, 2)}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tool Results */}
          {response.toolResults && response.toolResults.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">Execution Results</h3>
              {response.toolResults.map((result: any, index: number) => (
                <div key={index} className="mb-4">
                  {result.toolName === 'executeCode' && result.result && (
                    <div className={`p-4 rounded ${
                      result.result.success 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="font-medium text-sm mb-2">
                        {result.result.success ? '✓ Execution Successful' : '✗ Execution Failed'}
                      </div>
                      {result.result.output && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-gray-600 mb-1">Output:</div>
                          <pre className="text-sm bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                            {result.result.output}
                          </pre>
                        </div>
                      )}
                      {result.result.error && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-red-600 mb-1">Error:</div>
                          <pre className="text-sm bg-white p-3 rounded border border-red-200 text-red-700">
                            {result.result.error}
                          </pre>
                        </div>
                      )}
                      {result.result.execution_time && (
                        <div className="mt-2 text-xs text-gray-600">
                          Execution time: {result.result.execution_time.toFixed(2)}s
                        </div>
                      )}
                    </div>
                  )}
                  {result.toolName === 'executeCode' && !result.result && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="font-medium text-sm text-yellow-700 mb-2">
                        ⚠ No result data available
                      </div>
                      <pre className="text-xs text-gray-600">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  )}
                  {result.toolName !== 'executeCode' && (
                    <div className="p-4 bg-gray-50 rounded">
                      <div className="font-medium text-sm mb-2">
                        Tool: {result.toolName}
                      </div>
                      <pre className="text-xs text-gray-600">
                        {JSON.stringify(result.result || result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Usage Stats */}
          {response.usage && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold mb-2">Usage Statistics</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Prompt tokens: {response.usage.promptTokens}</p>
                <p>Completion tokens: {response.usage.completionTokens}</p>
                <p>Total tokens: {response.usage.totalTokens}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {response.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-700 mb-2">Error</h3>
              <p className="text-sm text-red-600">{response.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
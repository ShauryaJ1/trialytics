'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function TestPage() {
  const [message, setMessage] = useState('Hello, test the medical AI');
  const [result, setResult] = useState<any>(null);
  
  const chatMutation = trpc.chat.useMutation({
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error) => {
      setResult({ error: error.message });
    }
  });

  const handleTest = () => {
    chatMutation.mutate({
      message,
      documents: undefined
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">vLLM Integration Test</h1>
        
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test vLLM Connection</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Test Message:</label>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter a test message..."
                className="w-full"
              />
            </div>
            
            <Button 
              onClick={handleTest} 
              disabled={chatMutation.isPending}
              className="w-full"
            >
              {chatMutation.isPending ? 'Testing...' : 'Test vLLM Connection'}
            </Button>
            
            {result && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Result:</h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

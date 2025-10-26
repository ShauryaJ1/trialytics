'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ChatSession({ chatId, initialMessages }: { chatId: string; initialMessages: UIMessage[] }) {
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: `/api/chat?sid=${chatId}` }),
    initialMessages,
  });

  const [input, setInput] = useState('');

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Qwen Chat</h1>
            <p className="text-sm text-gray-600 mt-1">
              Powered by VLLM with Qwen3-8B Model
            </p>
          </div>
          <a
            href="/structured"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Test Advanced Features →
          </a>
        </div>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Start a conversation with the AI assistant
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Ask anything and get intelligent responses in real-time
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-2xl px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <span className="font-semibold text-sm">
                      {message.role === 'user' ? 'You' : 'AI'}
                    </span>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">
                    {message.parts?.map((part, index) =>
                      part.type === 'text' ? <span key={index}>{part.text}</span> : null
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {(status === 'submitted' || status === 'streaming') && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 text-gray-900 px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-pulse flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    {status === 'streaming' && (
                      <button
                        onClick={() => stop()}
                        className="ml-2 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Stop
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-t border-red-200">
          <p className="text-red-600 text-sm">Error: {error.message}</p>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput('');
          }
        }}
        className="border-t border-gray-200 bg-white px-6 py-4"
      >
        <div className="flex space-x-4 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            disabled={status !== 'ready'}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={status !== 'ready' || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'streaming' || status === 'submitted' ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [chatId, setChatId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);

  // Establish or adopt the chat id from the URL (?id=...)
  useEffect(() => {
    const idParam = searchParams.get('id');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (idParam && uuidRegex.test(idParam)) {
      setChatId(idParam);
      return;
    }
    const newId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set('id', newId);
    router.replace(`/?${params.toString()}`);
    setChatId(newId);
  }, [router, searchParams]);

  // Load existing history for this chat id
  useEffect(() => {
    if (!chatId) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/chat?sid=${chatId}`);
        const data = await res.json();
        const msgs = Array.isArray(data?.messages) ? (data.messages as UIMessage[]) : [];
        if (active) setInitialMessages(msgs);
      } catch (_err) {
        if (active) setInitialMessages([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [chatId]);

  if (!chatId || initialMessages === null) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">Loading chat…</div>
    );
  }

  return <ChatSession chatId={chatId} initialMessages={initialMessages} />;
}

'use client';

import { MessageWithAvatar, Message, MessageContent, MessageAvatar, Response } from './message-component';

export default function MessageDemo() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Message Component Demo</h1>
      
      <div className="space-y-2 mb-8">
        <h2 className="text-lg font-semibold">Contained Variant (Default)</h2>
        <p className="text-sm text-gray-600">Traditional chat bubble style with colored backgrounds</p>
      </div>
      
      <div className="space-y-4">
        {/* User message - contained */}
        <MessageWithAvatar from="user" variant="contained" name="Human">
          <Response>
            What&apos;s the weather like in San Francisco?
          </Response>
        </MessageWithAvatar>
        
        {/* Assistant message - contained */}
        <MessageWithAvatar from="assistant" variant="contained" name="Assistant">
          <Response>
            I&apos;d be happy to help you with the weather in San Francisco! Let me check that for you.
          </Response>
          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
            <div className="text-sm font-medium text-blue-900 mb-1">Weather Information</div>
            <div className="text-sm text-blue-800">
              <div>🌤️ Partly Cloudy</div>
              <div>Temperature: 68°F (20°C)</div>
              <div>Humidity: 65%</div>
              <div>Wind: 12 mph W</div>
            </div>
          </div>
        </MessageWithAvatar>
      </div>
      
      <div className="space-y-2 mt-12 mb-8">
        <h2 className="text-lg font-semibold">Flat Variant</h2>
        <p className="text-sm text-gray-600">Modern minimalist style similar to ChatGPT and Gemini</p>
      </div>
      
      <div className="space-y-4">
        {/* User message - flat */}
        <MessageWithAvatar from="user" variant="flat" name="Human">
          <Response>
            Can you explain quantum computing in simple terms?
          </Response>
        </MessageWithAvatar>
        
        {/* Assistant message - flat */}
        <MessageWithAvatar from="assistant" variant="flat" name="Assistant">
          <Response>
            Quantum computing is a revolutionary approach to processing information that leverages the strange properties of quantum mechanics. Here&apos;s a simple explanation:
          </Response>
          
          <div className="mt-4 space-y-3">
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">1</div>
              <div className="flex-1">
                <div className="font-medium">Classical vs Quantum Bits</div>
                <div className="text-sm text-gray-600 mt-1">
                  Classical computers use bits that are either 0 or 1. Quantum computers use qubits that can be 0, 1, or both simultaneously (superposition).
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">2</div>
              <div className="flex-1">
                <div className="font-medium">Parallel Processing</div>
                <div className="text-sm text-gray-600 mt-1">
                  This superposition allows quantum computers to explore multiple solutions simultaneously, making them potentially much faster for certain problems.
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">3</div>
              <div className="flex-1">
                <div className="font-medium">Real-world Applications</div>
                <div className="text-sm text-gray-600 mt-1">
                  Quantum computers excel at tasks like cryptography, drug discovery, optimization problems, and simulating quantum systems.
                </div>
              </div>
            </div>
          </div>
        </MessageWithAvatar>
      </div>
      
      <div className="space-y-2 mt-12 mb-8">
        <h2 className="text-lg font-semibold">Custom Styling</h2>
        <p className="text-sm text-gray-600">Messages with custom avatars and content</p>
      </div>
      
      <div className="space-y-4">
        {/* System message */}
        <Message from="system">
          <MessageAvatar from="system" name="System" />
          <div className="max-w-3xl">
            <MessageContent variant="flat" from="system">
              <div className="text-sm">
                ⚠️ <strong>System Notice:</strong> The AI model has been updated to provide more accurate and helpful responses.
              </div>
            </MessageContent>
          </div>
        </Message>
        
        {/* Message with custom avatar */}
        <MessageWithAvatar 
          from="assistant" 
          variant="contained" 
          avatarSrc="https://api.dicebear.com/7.x/bottts/svg?seed=ai-assistant"
          name="AI Assistant"
        >
          <Response>
            I&apos;m using a custom avatar! You can provide any image URL to customize the appearance of messages.
          </Response>
        </MessageWithAvatar>
      </div>
    </div>
  );
}

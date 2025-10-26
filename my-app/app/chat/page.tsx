'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { trpc } from '@/lib/trpc-provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Database, 
  BarChart3, 
  Upload, 
  X, 
  Send
} from 'lucide-react';
import { 
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';

interface UploadedFile {
  id: string;
  type: 'protocol' | 'rawData' | 'sap';
  file: File;
  content: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  reasoning?: string; // Add reasoning field for <think> content
}

const documentTypes = {
  protocol: {
    label: 'Clinical Trial Protocol',
    icon: FileText,
    color: 'bg-blue-100 text-blue-800',
    accept: { 'application/pdf': ['.pdf'] }
  },
  rawData: {
    label: 'Raw Clean Data',
    icon: Database,
    color: 'bg-green-100 text-green-800',
    accept: { 'text/csv': ['.csv'], 'application/json': ['.json'] }
  },
  sap: {
    label: 'Statistical Analysis Protocol',
    icon: BarChart3,
    color: 'bg-purple-100 text-purple-800',
    accept: { 'application/pdf': ['.pdf'] }
  }
};

export default function ChatPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  
  const chatMutation = trpc.chat.useMutation({
    onSuccess: (data) => {
      // Extract reasoning content from <think> tags
      const reasoningMatch = data.response.match(/<think>([\s\S]*?)<\/redacted_reasoning>/);
      const reasoning = reasoningMatch ? reasoningMatch[1].trim() : undefined;
      
      // Clean the response by removing both <thinking> and <think> tags
      const cleanContent = data.response
        .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
        .replace(/<think>[\s\S]*?<\/redacted_reasoning>/g, '')
        .trim();

      const newMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: cleanContent,
        thinking: data.thinking || undefined,
        reasoning: reasoning,
      };
      setMessages(prev => [...prev, newMessage]);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const onDrop = useCallback((acceptedFiles: File[], type: 'protocol' | 'rawData' | 'sap') => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        const newFile: UploadedFile = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          file,
          content
        };
        setUploadedFiles(prev => [...prev.filter(f => f.type !== type), newFile]);
      };
      reader.readAsText(file);
    }
  }, []);

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: input,
    };
    setMessages(prev => [...prev, userMessage]);

    // Prepare documents for tRPC call
    const documents = uploadedFiles.reduce((acc, file) => {
      acc[file.type] = file.content;
      return acc;
    }, {} as Record<string, string>);

    // Clear input
    setInput('');

    try {
      await chatMutation.mutateAsync({
        message: input,
        documents: documents.protocol || documents.rawData || documents.sap ? documents : undefined
      });
    } catch (error) {
      console.error('Chat error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Medical AI Chat</h1>
        
        {/* Document Upload Area */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(documentTypes).map(([type, config]) => {
              const Icon = config.icon;
              const uploadedFile = uploadedFiles.find(f => f.type === type);
              
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-gray-600" />
                    <span className="font-medium">{config.label}</span>
                  </div>
                  
                  {uploadedFile ? (
                    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge className={config.color}>
                          {uploadedFile.file.name}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadedFile.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <DocumentDropzone
                      onDrop={(files) => onDrop(files, type as 'protocol' | 'rawData' | 'sap')}
                      accept={config.accept}
                      type={type}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Chat Interface */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">AI Assistant</h2>
          <div className="space-y-4">
            {/* Messages */}
            <div className="h-96 overflow-y-auto space-y-4 border rounded-lg p-4 bg-white">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-900'
                  }`}>
                    {message.role === 'assistant' && (message.thinking || message.reasoning) && (
                      <Reasoning 
                        className="w-full mb-2" 
                        isStreaming={false}
                        defaultOpen={false}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>
                          {message.reasoning || message.thinking || ''}
                        </ReasoningContent>
                      </Reasoning>
                    )}
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
                    <Reasoning 
                      className="w-full" 
                      isStreaming={true}
                      defaultOpen={true}
                    >
                      <ReasoningTrigger />
                      <ReasoningContent>
                        AI is analyzing your request and uploaded documents...
                      </ReasoningContent>
                    </Reasoning>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your uploaded documents..."
                className="flex-1"
                disabled={chatMutation.isPending}
              />
              <Button type="submit" disabled={chatMutation.isPending || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}

interface DocumentDropzoneProps {
  onDrop: (files: File[]) => void;
  accept: Record<string, string[]>;
  type: string;
}

function DocumentDropzone({ onDrop, accept, type }: DocumentDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
        isDragActive 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
      <p className="text-sm text-gray-600">
        {isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
      </p>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { ChevronRight } from 'lucide-react';

// Main Reasoning component following AI SDK Elements pattern
interface ReasoningProps extends React.ComponentProps<typeof CollapsiblePrimitive.Root> {
  isStreaming?: boolean;
  children: React.ReactNode;
}

export function Reasoning({ 
  isStreaming = false, 
  children,
  className = '',
  ...props 
}: ReasoningProps) {
  const [open, setOpen] = useState(false);

  // Auto-open when streaming starts, auto-close when it ends
  useEffect(() => {
    if (isStreaming) {
      setOpen(true);
    } else {
      // Keep it open after streaming ends (user can manually close)
      // If you want auto-close after streaming, uncomment:
      // setTimeout(() => setOpen(false), 500);
    }
  }, [isStreaming]);

  return (
    <CollapsiblePrimitive.Root
      open={open}
      onOpenChange={setOpen}
      className={`w-full ${className}`}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.Root>
  );
}

// Reasoning Trigger component
interface ReasoningTriggerProps extends React.ComponentProps<typeof CollapsiblePrimitive.Trigger> {
  title?: string;
}

export function ReasoningTrigger({ 
  title = 'Reasoning',
  className = '',
  ...props 
}: ReasoningTriggerProps) {
  return (
    <CollapsiblePrimitive.Trigger
      className={`flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${className}`}
      {...props}
    >
      <div className="flex items-center gap-2">
        <ChevronRight className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
        <svg
          className="h-4 w-4 text-purple-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <span>{title}</span>
      </div>
    </CollapsiblePrimitive.Trigger>
  );
}

// Reasoning Content component
interface ReasoningContentProps extends React.ComponentProps<typeof CollapsiblePrimitive.Content> {
  children: React.ReactNode;
  isStreaming?: boolean;
}

export function ReasoningContent({ 
  children,
  isStreaming = false,
  className = '',
  ...props 
}: ReasoningContentProps) {
  return (
    <CollapsiblePrimitive.Content
      className={`mt-2 rounded-lg border border-gray-200 bg-white p-4 ${className}`}
      {...props}
    >
      <div className="relative">
        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700">
          {children}
          {isStreaming && (
            <span className="inline-block h-4 w-2 animate-pulse bg-purple-500 ml-1" />
          )}
        </pre>
      </div>
    </CollapsiblePrimitive.Content>
  );
}

// Utility to parse reasoning blocks from streaming text
export function parseStreamingReasoning(text: string): {
  parts: Array<{
    type: 'text' | 'reasoning';
    content: string;
    isComplete: boolean;
  }>;
} {
  const parts: Array<{
    type: 'text' | 'reasoning';
    content: string;
    isComplete: boolean;
  }> = [];
  
  // Match both complete and incomplete think blocks
  const regex = /<think>([\s\S]*?)(<\/think>|$)/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add any text before the think block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
        isComplete: true
      });
    }
    
    // Add the reasoning block
    const reasoningContent = match[1];
    const hasClosingTag = match[2] === '</think>';
    
    parts.push({
      type: 'reasoning',
      content: reasoningContent,
      isComplete: hasClosingTag
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add any remaining text after the last think block
  if (lastIndex < text.length) {
    // Check if we're in the middle of an opening think tag
    const remainingText = text.slice(lastIndex);
    if (remainingText.includes('<think') && !remainingText.includes('<think>')) {
      // Partial opening tag, don't add it yet
    } else if (text.slice(lastIndex).trim()) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex),
        isComplete: true
      });
    }
  }
  
  // Check if there's an unclosed think tag at the end
  const openThinkCount = (text.match(/<think>/g) || []).length;
  const closeThinkCount = (text.match(/<\/think>/g) || []).length;
  
  if (openThinkCount > closeThinkCount) {
    // We have an unclosed think block - mark the last reasoning part as incomplete
    const lastReasoningPart = parts.filter(p => p.type === 'reasoning').pop();
    if (lastReasoningPart) {
      lastReasoningPart.isComplete = false;
    }
  }
  
  return { parts };
}

// Helper to extract text without think tags for display
export function extractMainText(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// Legacy function for backwards compatibility
export function extractReasoning(text: string): {
  reasoning: string[];
  mainText: string;
} {
  const thinkPattern = /<think>([\s\S]*?)<\/think>/g;
  const reasoningBlocks: string[] = [];
  let mainText = text;
  
  let match;
  while ((match = thinkPattern.exec(text)) !== null) {
    reasoningBlocks.push(match[1].trim());
    mainText = mainText.replace(match[0], '');
  }
  
  mainText = mainText.trim().replace(/\n{3,}/g, '\n\n');
  
  return {
    reasoning: reasoningBlocks,
    mainText
  };
}
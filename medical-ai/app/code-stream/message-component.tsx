'use client';

import React from 'react';

// Message component following AI SDK Elements pattern
interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  from: 'user' | 'assistant' | 'system';
  children: React.ReactNode;
}

export function Message({ from, children, className = '', ...props }: MessageProps) {
  return (
    <div
      className={`flex gap-3 ${
        from === 'user' ? 'justify-end' : 'justify-start'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// MessageContent component with variants
interface MessageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'contained' | 'flat';
  children: React.ReactNode;
}

export function MessageContent({ 
  variant = 'contained', 
  children, 
  className = '', 
  ...props 
}: MessageContentProps & { from?: 'user' | 'assistant' | 'system' }) {
  const from = props.from || 'assistant';
  
  const variantClasses = {
    contained: {
      user: 'bg-blue-600 text-white rounded-lg px-4 py-3',
      assistant: 'bg-white border border-gray-200 rounded-lg px-4 py-3',
      system: 'bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 italic',
    },
    flat: {
      user: 'bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900',
      assistant: 'text-gray-900',
      system: 'bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-900',
    },
  };
  
  return (
    <div
      className={`${variantClasses[variant][from]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// MessageAvatar component
interface MessageAvatarProps {
  src?: string;
  name?: string;
  from?: 'user' | 'assistant' | 'system';
}

export function MessageAvatar({ src, name, from = 'assistant' }: MessageAvatarProps) {
  const initials = name ? name.slice(0, 2).toUpperCase() : 
                   from === 'user' ? 'U' : 'AI';
  
  const bgColors = {
    user: 'bg-blue-600 text-white',
    assistant: 'bg-gray-200 text-gray-600',
    system: 'bg-yellow-500 text-white',
  };
  
  if (src) {
    return (
      <div className="shrink-0">
        <img 
          src={src} 
          alt={name || from}
          className="w-8 h-8 rounded-full"
        />
      </div>
    );
  }
  
  return (
    <div className="shrink-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${bgColors[from]}`}>
        {initials}
      </div>
    </div>
  );
}


// Helper component to combine avatar and content
interface MessageWithAvatarProps {
  from: 'user' | 'assistant' | 'system';
  children: React.ReactNode;
  variant?: 'contained' | 'flat';
  avatarSrc?: string;
  name?: string;
}

export function MessageWithAvatar({ 
  from, 
  children, 
  variant = 'contained',
  avatarSrc,
  name
}: MessageWithAvatarProps) {
  return (
    <Message from={from}>
      {from === 'user' ? (
        <>
          <div className="max-w-3xl order-2">
            <MessageContent variant={variant} from={from}>
              {children}
            </MessageContent>
          </div>
          <div className="order-1">
            <MessageAvatar from={from} src={avatarSrc} name={name} />
          </div>
        </>
      ) : (
        <>
          <MessageAvatar from={from} src={avatarSrc} name={name} />
          <div className="max-w-3xl">
            <MessageContent variant={variant} from={from}>
              {children}
            </MessageContent>
          </div>
        </>
      )}
    </Message>
  );
}

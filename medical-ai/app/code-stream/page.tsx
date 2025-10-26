'use client';

import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import { useState, useEffect, useMemo } from 'react';
import type { ExecuteCodeMessage } from '../api/execute-code-stream/route';
import { 
  Reasoning, 
  ReasoningTrigger, 
  ReasoningContent 
} from '@/components/ai-elements/reasoning';
import { Response } from '@/components/ai-elements/response';
import { CodeBlock, CodeBlockCopyButton } from '@/components/ai-elements/code-block';
import { MessageWithAvatar } from './message-component';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileUploadS3, type UploadedFile } from '@/components/file-upload-s3';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { ChartDisplay } from './chart-components';

// Parse reasoning blocks from streaming text
function parseStreamingReasoning(text: string): {
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
  
  const regex = /<think>([\s\S]*?)(<\/think>|$)/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
        isComplete: true
      });
    }
    
    const reasoningContent = match[1];
    const hasClosingTag = match[2] === '</think>';
    
    parts.push({
      type: 'reasoning',
      content: reasoningContent,
      isComplete: hasClosingTag
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (!remainingText.includes('<think') || remainingText.includes('<think>')) {
      parts.push({
        type: 'text',
        content: remainingText,
        isComplete: true
      });
    }
  }
  
  return { parts };
}


// Visual component for code execution results
function CodeExecutionResult({ 
  result, 
  code 
}: { 
  result: { 
    success: boolean; 
    output?: string; 
    error?: string | null; 
    execution_time?: number | null;
    code?: string;
  };
  code?: string;
}) {
  const displayCode = result.code || code;
  
  return (
    <div className="space-y-3">
      {displayCode && (
        <div>
          <div className="text-sm font-medium text-gray-600 mb-2">Code:</div>
          <CodeBlock code={displayCode} language="python" showLineNumbers={true}>
            <CodeBlockCopyButton />
          </CodeBlock>
        </div>
      )}
      
      <div className={`rounded-lg p-4 ${
        result.success 
          ? 'bg-green-50 border-2 border-green-200' 
          : 'bg-red-50 border-2 border-red-200'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {result.success ? (
            <>
              <span className="text-green-600">✓</span>
              <span className="font-medium text-green-800">Execution Successful</span>
            </>
          ) : (
            <>
              <span className="text-red-600">✗</span>
              <span className="font-medium text-red-800">Execution Failed</span>
            </>
          )}
          {result.execution_time && (
            <span className="text-sm text-gray-600 ml-auto">
              {result.execution_time.toFixed(2)}s
            </span>
          )}
        </div>
        
        {result.output && result.output.trim() && (
          <div className="mt-3">
            <div className="text-sm font-medium text-gray-700 mb-1">Output:</div>
            <CodeBlock code={result.output} language="text" showLineNumbers={false}>
              <CodeBlockCopyButton />
            </CodeBlock>
          </div>
        )}
        
        {result.error && (
          <div className="mt-3">
            <div className="text-sm font-medium text-red-700 mb-1">Error:</div>
            <pre className="bg-red-950 text-red-200 p-3 rounded border border-red-800 overflow-x-auto text-sm font-mono">
              {result.error}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// Visual component for table display
function TableDisplay({ 
  result 
}: { 
  result: any; // Using any to avoid type conflicts with the tool output
}) {
  if (!result.success || !result.headers || !result.rows) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
        <div className="text-red-800 font-medium">Table Error</div>
        <div className="text-sm text-red-600 mt-1">{result.error || 'Invalid table data'}</div>
      </div>
    );
  }

  const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium text-blue-900">Data Table</div>
        <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
          {result.rowCount} rows × {result.columnCount} columns
        </span>
      </div>
      
      <div className="bg-white rounded border border-gray-300 overflow-hidden">
        <Table className="border-collapse">
          {result.caption && <TableCaption className="text-gray-600 px-4 py-2">{result.caption}</TableCaption>}
          <TableHeader>
            <TableRow className="bg-gray-100 border-b-2 border-gray-300">
              {result.headers.map((header: string, idx: number) => (
                <TableHead 
                  key={idx} 
                  className={`border-r border-gray-300 last:border-r-0 font-semibold text-gray-900 px-4 py-2 ${getAlignmentClass(result.alignment?.[idx])}`}
                >
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((row: string[], rowIdx: number) => (
              <TableRow key={rowIdx} className="border-b border-gray-200 hover:bg-gray-50">
                {row.map((cell: string, cellIdx: number) => (
                  <TableCell 
                    key={cellIdx} 
                    className={`border-r border-gray-200 last:border-r-0 px-4 py-2 ${getAlignmentClass(result.alignment?.[cellIdx])}`}
                  >
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function CodeStreamChat() {
  const [input, setInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFilePanel, setShowFilePanel] = useState(false);
  
  const { messages, sendMessage: originalSendMessage, status } = useChat<ExecuteCodeMessage>({
    transport: new DefaultChatTransport({
      api: '/api/execute-code-stream',
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  // Wrap sendMessage to inject file context
  const sendMessage = (message: { text: string }) => {
    if (uploadedFiles.length > 0) {
      // Create file context system message
      const fileContext = `## 📁 Uploaded Files Available:

You have access to ${uploadedFiles.length} file(s) that the user has uploaded. Use these presigned URLs in your Python code:

${uploadedFiles.map((file, index) => `
### File ${index + 1}: ${file.name}
- **Type**: ${file.type || 'Unknown'}
- **S3 Key**: ${file.s3Key}
- **Presigned URL Variable**: url_${index + 1}

\`\`\`python
url_${index + 1} = "${file.presignedUrl}"
\`\`\`

${file.name.endsWith('.csv') ? `
# Load as DataFrame:
import pandas as pd
import requests
import io
response = requests.get(url_${index + 1})
df = pd.read_csv(io.BytesIO(response.content))
` : file.name.endsWith('.json') ? `
# Load JSON:
import json
import requests
response = requests.get(url_${index + 1})
data = json.loads(response.content)
` : file.name.endsWith('.pdf') ? `
# Load PDF:
import PyPDF2
import requests
import io
response = requests.get(url_${index + 1})
pdf_reader = PyPDF2.PdfReader(io.BytesIO(response.content))
` : `
# Load file:
import requests
response = requests.get(url_${index + 1})
content = response.content
`}
`).join('\n')}

**Important**: Always use these exact presigned URLs when loading the files. They expire after 1 hour.`;

      // Prepend file context to the user message
      const enhancedMessage = `${fileContext}

User request: ${message.text}`;
      
      return originalSendMessage({ text: enhancedMessage });
    }
    
    return originalSendMessage(message);
  };

  // Example prompts - dynamic based on whether files are uploaded
  const examplePrompts = uploadedFiles.length > 0 
    ? [
        `Load and analyze ${uploadedFiles[0].name}`,
        `Show the first 10 rows of the uploaded data`,
        `Calculate summary statistics for the uploaded file`,
        `Create a bar chart from the uploaded data`,
        `Visualize data distribution with a pie chart`,
        `Plot trends over time using a line chart`,
        `Show correlations with a scatter plot`,
        `Perform data cleaning and create visualizations`,
      ]
    : [
        "Generate monthly sales data and visualize it with a bar chart",
        "Create a pie chart showing market share distribution",
        "Show stock price trends over time with a line chart",
        "Plot correlation between two variables using scatter plot",
        "Compare programming languages popularity with a horizontal bar chart",
        "Visualize time series data with multiple line charts",
        "Create a stacked bar chart for category comparisons",
        "Show data distribution using pie and doughnut charts",
      ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">Code Execution with Streaming</h1>
          <p className="text-sm text-gray-600 mt-1">
            AI-powered Python code execution with real-time streaming and visual feedback
          </p>
        </div>
      </div>

      {/* File Upload Panel */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <button
            onClick={() => setShowFilePanel(!showFilePanel)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            {showFilePanel ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            File Uploads
            {uploadedFiles.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
              </span>
            )}
          </button>
          
          {showFilePanel && (
            <div className="mt-4 pb-2">
              <FileUploadS3
                uploadedFiles={uploadedFiles}
                onFilesUploaded={setUploadedFiles}
                onRemoveFile={(index) => {
                  setUploadedFiles(files => files.filter((_, i) => i !== index));
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-6">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">Ready to execute code</h3>
              <p className="text-sm text-gray-500 mb-6">
                Ask me to write and execute Python code, or try one of the examples below
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {examplePrompts.slice(0, 3).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(prompt);
                      sendMessage({ text: prompt });
                    }}
                    className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className="animate-in fade-in duration-500">
              <MessageWithAvatar 
                from={message.role as 'user' | 'assistant'} 
                variant="flat"
                name={message.role === 'user' ? 'You' : 'Assistant'}
              >
                {/* Render message parts */}
                {message.parts?.map((part, i) => {
                  const key = `${message.id}-${i}`;
                  
                  switch (part.type) {
                    case 'text':
                      // Parse text for reasoning blocks
                      const { parts } = parseStreamingReasoning(part.text || '');
                      const isCurrentlyStreaming = i === (message.parts?.length ?? 0) - 1 && 
                                                   message.role === 'assistant' && status === 'streaming';
                      
                      return (
                        <div key={key}>
                          {parts.map((textPart, idx) => {
                            if (textPart.type === 'reasoning') {
                              const isThisPartStreaming = isCurrentlyStreaming && 
                                                         idx === parts.length - 1 && 
                                                         !textPart.isComplete;
                              return (
                                <Reasoning 
                                  key={`reasoning-${idx}`}
                                  isStreaming={isThisPartStreaming}
                                  className="mb-3"
                                >
                                  <ReasoningTrigger />
                                  <ReasoningContent>
                                    {textPart.content}
                                  </ReasoningContent>
                                </Reasoning>
                              );
                            } else if (textPart.content.trim()) {
                              // Remove code blocks from text since they'll be shown in tool results
                              const cleanedContent = textPart.content
                                .replace(/```[\s\S]*?```/g, '') // Remove code blocks
                                .replace(/^\s*Output:?\s*$/gm, '') // Remove "Output:" lines
                                .replace(/^\s*Code:?\s*$/gm, '') // Remove "Code:" lines
                                .trim();
                              
                              if (cleanedContent) {
                                return (
                                  <Response key={`text-${idx}`}>
                                    {cleanedContent}
                                  </Response>
                                );
                              }
                              return null;
                            }
                            return null;
                          })}
                        </div>
                      );
                        
                        case 'tool-executeCode':
                          return (
                            <div key={part.toolCallId} className="mt-3">
                              {part.state === 'input-streaming' && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                                  <span className="text-sm">Executing code...</span>
                                </div>
                              )}
                              {part.state === 'output-available' && part.output && (
                                <CodeExecutionResult 
                                  result={part.output} 
                                  code={part.input?.code}
                                />
                              )}
                            </div>
                          );
                        
                        case 'tool-displayTable':
                          return (
                            <div key={part.toolCallId} className="mt-3">
                              {part.state === 'input-streaming' && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                                  <span className="text-sm">Preparing table...</span>
                                </div>
                              )}
                              {part.state === 'output-available' && part.output && (
                                <TableDisplay result={part.output} />
                              )}
                            </div>
                          );
                        
                        case 'tool-displayBarChart':
                        case 'tool-displayPieChart':
                        case 'tool-displayLineChart':
                        case 'tool-displayScatterChart':
                          const chartType = part.type.replace('tool-display', '').replace('Chart', '').toLowerCase() as 'bar' | 'pie' | 'line' | 'scatter';
                          return (
                            <div key={part.toolCallId} className="mt-3">
                              {part.state === 'input-streaming' && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                                  <span className="text-sm">Preparing {chartType} chart...</span>
                                </div>
                              )}
                              {part.state === 'output-available' && part.output && part.output.success && (
                                <ChartDisplay
                                  type={part.output.type || chartType}
                                  data={part.output.data}
                                  title={part.output.title}
                                  description={part.output.description}
                                  config={part.output.config}
                                />
                              )}
                              {part.state === 'output-available' && part.output && !part.output.success && (
                                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                                  <div className="text-red-800 font-medium">Chart Error</div>
                                  <div className="text-sm text-red-600 mt-1">Failed to create chart</div>
                                </div>
                              )}
                            </div>
                          );
                        
                        default:
                          // Handle any other tool types generically
                          if (part.type?.startsWith('tool-')) {
                            const toolPart = part as any;
                            return (
                              <div key={toolPart.toolCallId || key} className="mt-3 p-3 bg-gray-100 rounded">
                                <div className="text-xs text-gray-600">
                                  Tool: {part.type.replace('tool-', '')}
                                </div>
                                {toolPart.state === 'output-available' && (
                                  <pre className="text-xs mt-2">
                                    {JSON.stringify(toolPart.output, null, 2)}
                                  </pre>
                                )}
                              </div>
                            );
                          }
                          return null;
                  }
                })}
              </MessageWithAvatar>
            </div>
          ))}
          
          {status === 'streaming' && messages[messages.length - 1]?.role !== 'assistant' && (
            <MessageWithAvatar from="assistant" variant="flat" name="Assistant">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </MessageWithAvatar>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Example prompts */}
          <div className="mb-3 flex flex-wrap gap-2">
            {examplePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInput(prompt)}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                {prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt}
              </button>
            ))}
          </div>
          
          {/* Input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim() && status !== 'streaming') {
                sendMessage({ text: input });
                setInput('');
              }
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to write and execute Python code..."
              disabled={status === 'streaming'}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || status === 'streaming'}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'streaming' ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Sending...</span>
                </div>
              ) : (
                'Send'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

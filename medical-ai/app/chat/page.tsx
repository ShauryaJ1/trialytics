'use client';

import { useChat } from '@ai-sdk/react';
import {
 DefaultChatTransport,
 lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { ExecuteCodeMessage } from '../api/chat/execute-code-stream/route';
import {
 Reasoning,
 ReasoningTrigger,
 ReasoningContent
} from '@/components/ai-elements/reasoning';
import { Response } from '@/components/ai-elements/response';
import { CodeBlock, CodeBlockCopyButton } from '@/components/ai-elements/code-block';
import { MessageWithAvatar } from '../code-stream/message-component';
import { ArrowUp, ChevronRight, ChevronDown, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { FileUploadS3, type UploadedFile } from '@/components/file-upload-s3';


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
   <div className="space-y-4">
     {displayCode && (
       <div>
         <div className="text-sm font-medium text-gray-600 mb-3">Code:</div>
         <CodeBlock code={displayCode} language="python" showLineNumbers={true}>
           <CodeBlockCopyButton />
         </CodeBlock>
       </div>
     )}


     <div className={`rounded-xl p-5 border ${
       result.success
         ? 'bg-white border-gray-200 shadow-sm'
         : 'bg-white border-red-200 shadow-sm'
     }`}>
       <div className="flex items-center gap-3 mb-3">
         {result.success ? (
           <>
            <CheckCircle2 className="w-5 h-5 text-gray-900" strokeWidth={2} />
            <span className="font-medium text-gray-900">Execution Successful</span>
           </>
         ) : (
           <>
             <XCircle className="w-5 h-5 text-red-600" strokeWidth={2} />
             <span className="font-medium text-red-800">Execution Failed</span>
           </>
         )}
         {result.execution_time && (
           <span className="text-sm text-gray-900 ml-auto flex items-center gap-1.5">
             <Clock className="w-4 h-4" />
             {result.execution_time.toFixed(2)}s
           </span>
         )}
       </div>


       {result.output && result.output.trim() && (
         <div className="mt-4">
           <div className="text-sm font-medium text-gray-600 mb-2">Output:</div>
           <pre className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto text-sm font-mono text-gray-900">
             {result.output}
           </pre>
         </div>
       )}


       {result.error && (
         <div className="mt-4">
           <div className="text-sm font-medium text-red-700 mb-2">Error:</div>
           <pre className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700 text-sm overflow-x-auto font-mono">
             {result.error}
           </pre>
         </div>
       )}
     </div>
   </div>
 );
}


// Visual component for code analysis
function CodeAnalysisResult({
 result
}: {
 result: {
   lineCount: number;
   hasImports: boolean;
   hasPrintStatements: boolean;
   hasReturnStatements: boolean;
   issues: string[];
   suggestions: string[];
   code?: string;
 };
}) {
 return (
   <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
     <div className="font-medium text-gray-900">Code Analysis</div>


     {result.code && (
       <div>
         <div className="text-sm font-medium text-gray-600 mb-3">Analyzed Code:</div>
         <CodeBlock code={result.code} language="python" showLineNumbers={false}>
           <CodeBlockCopyButton />
         </CodeBlock>
       </div>
     )}


     <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
       <div>Lines of code: <span className="font-medium text-gray-900">{result.lineCount}</span></div>
       <div>Has imports: <span className="font-medium text-gray-900">{result.hasImports ? 'Yes' : 'No'}</span></div>
       <div>Has print statements: <span className="font-medium text-gray-900">{result.hasPrintStatements ? 'Yes' : 'No'}</span></div>
       <div>Has return statements: <span className="font-medium text-gray-900">{result.hasReturnStatements ? 'Yes' : 'No'}</span></div>
     </div>


     {result.issues.length > 0 && (
       <div>
         <div className="text-sm font-medium text-red-700 mb-2">Issues:</div>
         <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
           {result.issues.map((issue, i) => (
             <li key={i}>{issue}</li>
           ))}
         </ul>
       </div>
     )}


     {result.suggestions.length > 0 && (
       <div>
         <div className="text-sm font-medium text-gray-600 mb-2">Suggestions:</div>
         <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
           {result.suggestions.map((suggestion, i) => (
             <li key={i}>{suggestion}</li>
           ))}
         </ul>
       </div>
     )}
   </div>
 );
}


// Visual component for code examples
function CodeExamplesResult({
 result
}: {
 result: {
   category: string;
   example: {
     name: string;
     code: string;
   };
 };
}) {
 return (
   <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
     <div className="flex items-center justify-between">
       <div className="font-medium text-gray-900">Code Example</div>
       <span className="text-xs bg-gray-100 text-gray-900 px-3 py-1 rounded-full font-medium">
         {result.category}
       </span>
     </div>
     <div className="text-sm text-gray-600 mb-2">{result.example.name}</div>
     <CodeBlock code={result.example.code} language="python" showLineNumbers={true}>
       <CodeBlockCopyButton />
     </CodeBlock>
   </div>
 );
}


export default function CodeStreamChat() {
  const [input, setInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFilePanel, setShowFilePanel] = useState(true);
  
  const { messages, sendMessage: originalSendMessage, status } = useChat<ExecuteCodeMessage>({
   transport: new DefaultChatTransport({
     api: '/api/chat/execute-code-stream',
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



 return (
   <div className="flex flex-col min-h-screen bg-gray-50 font-sans page-transition">
    {/* Header */}
    <div className="bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-5xl font-bold text-teal-900">Analysis Assistant.</h1>
          
          <Link 
            href="/trials"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowUp className="w-4 h-4" />
            Back to Trials
          </Link>
        </div>
       </div>
     </div>



   {/* File Upload Panel */}
   <div className="bg-gray-50 border-b border-gray-200">
     <div className="max-w-7xl mx-auto px-8 py-3">
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
     <div className="flex-1 px-8 py-8 overflow-hidden transition-all duration-300">
       <div className="max-w-7xl mx-auto space-y-5 h-full">
         {messages.length === 0 && (
           <div className="text-center py-16">
             <div className="text-gray-400 mb-8">
               <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
             </div>
             <h3 className="text-lg font-medium text-gray-900 mb-3">Ready to Assist</h3>
             <p className="text-sm text-gray-900 mb-8 max-w-md mx-auto leading-relaxed">
               Upload medical documents above or ask questions to begin your analysis
             </p>
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
                             return (
                               <Response key={`text-${idx}`}>
                                 {textPart.content}
                               </Response>
                             );
                           }
                           return null;
                         })}
                       </div>
                     );
                      
                       case 'tool-executeCode':
                         return (
                           <div key={part.toolCallId} className="mt-4">
                             {part.state === 'input-streaming' && (
                               <div className="flex items-center gap-3 text-gray-900">
                                 <div className="animate-spin h-4 w-4 border-2 border-gray-200 border-t-transparent rounded-full"></div>
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


                       case 'tool-analyzeCode':
                         return (
                           <div key={part.toolCallId} className="mt-4">
                             {part.state === 'input-streaming' && (
                               <div className="flex items-center gap-3 text-gray-900">
                                 <div className="animate-spin h-4 w-4 border-2 border-gray-200 border-t-transparent rounded-full"></div>
                                 <span className="text-sm">Analyzing code...</span>
                               </div>
                             )}
                             {part.state === 'output-available' && part.output && (
                               <CodeAnalysisResult result={part.output} />
                             )}
                           </div>
                         );


                       case 'tool-getExamples':
                         return (
                           <div key={part.toolCallId} className="mt-4">
                             {part.state === 'input-streaming' && (
                               <div className="flex items-center gap-3 text-gray-900">
                                 <div className="animate-spin h-4 w-4 border-2 border-gray-200 border-t-transparent rounded-full"></div>
                                 <span className="text-sm">Loading examples...</span>
                               </div>
                             )}
                             {part.state === 'output-available' && part.output && (
                               <CodeExamplesResult result={part.output} />
                             )}
                           </div>
                         );
                      
                       default:
                         // Handle any other tool types generically
                         if (part.type?.startsWith('tool-')) {
                           const toolPart = part as any;
                           return (
                             <div key={toolPart.toolCallId || key} className="mt-4 p-4 bg-white border border-gray-200 rounded-xl">
                               <div className="text-xs text-gray-900 font-medium">
                                 Tool: {part.type.replace('tool-', '')}
                               </div>
                               {toolPart.state === 'output-available' && (
                                 <pre className="text-xs mt-3 text-gray-600 font-mono">
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
             <div className="flex items-center gap-3">
               <div className="flex gap-1.5">
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
               </div>
               <span className="text-sm text-gray-900">Processing...</span>
             </div>
           </MessageWithAvatar>
         )}
       </div>
     </div>


     {/* Input */}
     <div className="border-t border-gray-200 bg-gray-50 px-8 py-6">
       <div className="max-w-7xl mx-auto">


         {/* Input form */}
         <form
           onSubmit={(e) => {
             e.preventDefault();
             if (input.trim() && status !== 'streaming') {
               sendMessage({ text: input });
               setInput('');
             }
           }}
           className="flex gap-3 transition-all duration-300"
         >
           <input
             type="text"
             value={input}
             onChange={(e) => setInput(e.target.value)}
             placeholder="Ask a question or describe what you need analyzed..."
             disabled={status === 'streaming'}
             className="flex-1 px-5 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900 placeholder:text-gray-500 transition-all"
           />
           <button
             type="submit"
             disabled={!input.trim() || status === 'streaming'}
             className="px-8 py-3.5 bg-teal-600 text-white rounded-xl hover:bg-teal-600/90 disabled:bg-gray-200 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow-md"
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





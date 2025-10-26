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
import { MessageWithAvatar } from './message-component';
import { FileText, Image, FlaskConical, Upload, CheckCircle2, XCircle, Clock, ArrowLeft } from 'lucide-react';


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
         <div className="text-sm font-medium text-medical/70 mb-3">Code:</div>
         <CodeBlock code={displayCode} language="python" showLineNumbers={true}>
           <CodeBlockCopyButton />
         </CodeBlock>
       </div>
     )}


     <div className={`rounded-xl p-5 border ${
       result.success
         ? 'bg-white border-medical/10 shadow-sm'
         : 'bg-white border-red-200 shadow-sm'
     }`}>
       <div className="flex items-center gap-3 mb-3">
         {result.success ? (
           <>
             <CheckCircle2 className="w-5 h-5 text-medical" strokeWidth={2} />
             <span className="font-medium text-medical">Execution Successful</span>
           </>
         ) : (
           <>
             <XCircle className="w-5 h-5 text-red-600" strokeWidth={2} />
             <span className="font-medium text-red-800">Execution Failed</span>
           </>
         )}
         {result.execution_time && (
           <span className="text-sm text-medical/60 ml-auto flex items-center gap-1.5">
             <Clock className="w-4 h-4" />
             {result.execution_time.toFixed(2)}s
           </span>
         )}
       </div>


       {result.output && result.output.trim() && (
         <div className="mt-4">
           <div className="text-sm font-medium text-medical/70 mb-2">Output:</div>
           <pre className="bg-medical/5 p-4 rounded-lg border border-medical/10 overflow-x-auto text-sm font-mono text-medical">
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
   <div className="bg-white border border-medical/10 rounded-xl p-5 space-y-4 shadow-sm">
     <div className="font-medium text-medical">Code Analysis</div>


     {result.code && (
       <div>
         <div className="text-sm font-medium text-medical/70 mb-3">Analyzed Code:</div>
         <CodeBlock code={result.code} language="python" showLineNumbers={false}>
           <CodeBlockCopyButton />
         </CodeBlock>
       </div>
     )}


     <div className="grid grid-cols-2 gap-3 text-sm text-medical/80">
       <div>Lines of code: <span className="font-medium text-medical">{result.lineCount}</span></div>
       <div>Has imports: <span className="font-medium text-medical">{result.hasImports ? 'Yes' : 'No'}</span></div>
       <div>Has print statements: <span className="font-medium text-medical">{result.hasPrintStatements ? 'Yes' : 'No'}</span></div>
       <div>Has return statements: <span className="font-medium text-medical">{result.hasReturnStatements ? 'Yes' : 'No'}</span></div>
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
         <div className="text-sm font-medium text-medical/70 mb-2">Suggestions:</div>
         <ul className="list-disc list-inside text-sm text-medical/80 space-y-1">
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
   <div className="bg-white border border-medical/10 rounded-xl p-5 space-y-4 shadow-sm">
     <div className="flex items-center justify-between">
       <div className="font-medium text-medical">Code Example</div>
       <span className="text-xs bg-medical/10 text-medical px-3 py-1 rounded-full font-medium">
         {result.category}
       </span>
     </div>
     <div className="text-sm text-medical/80 mb-2">{result.example.name}</div>
     <CodeBlock code={result.example.code} language="python" showLineNumbers={true}>
       <CodeBlockCopyButton />
     </CodeBlock>
   </div>
 );
}


export default function CodeStreamChat() {
 const [input, setInput] = useState('');
 const [serverStatus, setServerStatus] = useState<any>(null);
 const [checkingServer, setCheckingServer] = useState(false);
  const { messages, sendMessage, status } = useChat<ExecuteCodeMessage>({
   transport: new DefaultChatTransport({
     api: '/api/chat/execute-code-stream',
   }),
   sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
 });


 // Check server status on mount
 useEffect(() => {
   checkServerStatus();
 }, []);


 const checkServerStatus = async () => {
   setCheckingServer(true);
   try {
     const res = await fetch('/api/chat/execute-code-stream');
     const data = await res.json();
     setServerStatus(data);
   } catch (error) {
     setServerStatus({ available: false, error: 'Failed to check server status' });
   } finally {
     setCheckingServer(false);
   }
 };


 // Example prompts
 const examplePrompts = [
   "Write and execute Python code to calculate the factorial of 10",
   "Create a pandas DataFrame with sales data and calculate total revenue by category",
   "Generate a matplotlib visualization showing sine and cosine waves",
   "Analyze this code for improvements: print('hello')",
   "Show me an example of machine learning code",
   "Write code to scrape data from a public API",
 ];


 return (
   <div className="flex flex-col h-screen bg-white font-sans">
    {/* Header */}
    <div className="bg-white border-b border-gray-100 px-8 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Link 
            href="/trials"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Trials
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-medical tracking-tight">Medical AI Assistant</h1>
        <p className="text-sm text-medical/60 mt-2 font-normal">
          AI-powered analysis with real-time processing and secure data handling
        </p>


         {/* Server Status */}
         <div className="mt-5 flex items-center gap-3">
           <span className="text-sm text-medical/60">Server Status:</span>
           {checkingServer ? (
             <span className="text-sm text-medical/40">Checking...</span>
           ) : (
             <>
               <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                 serverStatus?.available
                   ? 'bg-medical/10 text-medical'
                   : 'bg-red-50 text-red-700'
               }`}>
                 {serverStatus?.available ? '● Online' : '● Offline'}
               </span>
               <button
                 onClick={checkServerStatus}
                 className="px-3 py-1 text-xs border border-medical/20 rounded-lg hover:bg-medical/5 text-medical transition-colors"
               >
                 Refresh
               </button>
             </>
           )}
         </div>
       </div>
     </div>


     {/* Upload Cards Section */}
     <div className="bg-white border-b border-gray-100 px-8 py-8">
       <div className="max-w-6xl mx-auto">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Medical Records Card */}
           <button className="group relative bg-white border border-medical/10 rounded-2xl p-6 hover:border-medical/20 hover:shadow-lg transition-all duration-300 text-left">
             <div className="flex items-start justify-between mb-4">
               <div className="w-12 h-12 rounded-xl bg-medical/5 flex items-center justify-center group-hover:bg-medical/10 transition-colors">
                 <FileText className="w-6 h-6 text-medical" strokeWidth={2} />
               </div>
               <Upload className="w-5 h-5 text-medical/40 group-hover:text-medical/60 transition-colors" />
             </div>
             <h3 className="font-medium text-medical mb-2">Medical Records</h3>
             <p className="text-sm text-medical/60 leading-relaxed">
               Upload patient records, reports, and clinical documents for analysis
             </p>
           </button>


           {/* Images & Scans Card */}
           <button className="group relative bg-white border border-medical/10 rounded-2xl p-6 hover:border-medical/20 hover:shadow-lg transition-all duration-300 text-left">
             <div className="flex items-start justify-between mb-4">
               <div className="w-12 h-12 rounded-xl bg-medical/5 flex items-center justify-center group-hover:bg-medical/10 transition-colors">
                 <Image className="w-6 h-6 text-medical" strokeWidth={2} />
               </div>
               <Upload className="w-5 h-5 text-medical/40 group-hover:text-medical/60 transition-colors" />
             </div>
             <h3 className="font-medium text-medical mb-2">Images & Scans</h3>
             <p className="text-sm text-medical/60 leading-relaxed">
               Upload X-rays, MRI, CT scans, and other diagnostic imaging files
             </p>
           </button>


           {/* Lab Results Card */}
           <button className="group relative bg-white border border-medical/10 rounded-2xl p-6 hover:border-medical/20 hover:shadow-lg transition-all duration-300 text-left">
             <div className="flex items-start justify-between mb-4">
               <div className="w-12 h-12 rounded-xl bg-medical/5 flex items-center justify-center group-hover:bg-medical/10 transition-colors">
                 <FlaskConical className="w-6 h-6 text-medical" strokeWidth={2} />
               </div>
               <Upload className="w-5 h-5 text-medical/40 group-hover:text-medical/60 transition-colors" />
             </div>
             <h3 className="font-medium text-medical mb-2">Lab Results</h3>
             <p className="text-sm text-medical/60 leading-relaxed">
               Upload laboratory test results, blood work, and diagnostic data
             </p>
           </button>
         </div>
       </div>
     </div>


     {/* Messages */}
     <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50/30">
       <div className="max-w-6xl mx-auto space-y-5">
         {messages.length === 0 && (
           <div className="text-center py-16">
             <div className="text-medical/20 mb-8">
               <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
             </div>
             <h3 className="text-lg font-medium text-medical mb-3">Ready to Assist</h3>
             <p className="text-sm text-medical/60 mb-8 max-w-md mx-auto leading-relaxed">
               Upload medical documents above or ask questions to begin your analysis
             </p>
             <div className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto">
               {examplePrompts.slice(0, 3).map((prompt, i) => (
                 <button
                   key={i}
                   onClick={() => {
                     setInput(prompt);
                     sendMessage({ text: prompt });
                   }}
                   className="px-4 py-2 text-xs bg-white text-medical border border-medical/10 rounded-lg hover:border-medical/20 hover:shadow-sm transition-all"
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
                               <div className="flex items-center gap-3 text-medical/60">
                                 <div className="animate-spin h-4 w-4 border-2 border-medical border-t-transparent rounded-full"></div>
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
                               <div className="flex items-center gap-3 text-medical/60">
                                 <div className="animate-spin h-4 w-4 border-2 border-medical border-t-transparent rounded-full"></div>
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
                               <div className="flex items-center gap-3 text-medical/60">
                                 <div className="animate-spin h-4 w-4 border-2 border-medical border-t-transparent rounded-full"></div>
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
                             <div key={toolPart.toolCallId || key} className="mt-4 p-4 bg-white border border-medical/10 rounded-xl">
                               <div className="text-xs text-medical/60 font-medium">
                                 Tool: {part.type.replace('tool-', '')}
                               </div>
                               {toolPart.state === 'output-available' && (
                                 <pre className="text-xs mt-3 text-medical/80 font-mono">
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
                 <div className="w-2 h-2 bg-medical/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                 <div className="w-2 h-2 bg-medical/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                 <div className="w-2 h-2 bg-medical/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
               </div>
               <span className="text-sm text-medical/60">Processing...</span>
             </div>
           </MessageWithAvatar>
         )}
       </div>
     </div>


     {/* Input */}
     <div className="border-t border-gray-100 bg-white px-8 py-6">
       <div className="max-w-6xl mx-auto">
         {/* Example prompts */}
         <div className="mb-4 flex flex-wrap gap-2">
           {examplePrompts.map((prompt, i) => (
             <button
               key={i}
               onClick={() => setInput(prompt)}
               className="px-3 py-1.5 text-xs bg-medical/5 text-medical/70 rounded-lg hover:bg-medical/10 hover:text-medical transition-colors border border-medical/10"
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
             placeholder="Ask a question or describe what you need analyzed..."
             disabled={status === 'streaming' || !serverStatus?.available}
             className="flex-1 px-5 py-3.5 border border-medical/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical/20 focus:border-medical/30 disabled:bg-gray-50 disabled:text-medical/40 text-medical placeholder:text-medical/40 transition-all"
           />
           <button
             type="submit"
             disabled={!input.trim() || status === 'streaming' || !serverStatus?.available}
             className="px-8 py-3.5 bg-medical text-white rounded-xl hover:bg-medical/90 disabled:bg-medical/20 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow-md"
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


         {!serverStatus?.available && (
           <p className="mt-3 text-xs text-red-600 flex items-center gap-2">
             <XCircle className="w-3.5 h-3.5" />
             Server offline. Code execution unavailable.
           </p>
         )}
       </div>
     </div>
   </div>
 );
}





import { qwenModel } from '@/lib/ai-provider';
import {
  type InferUITools,
  type ToolSet,
  type UIDataTypes,
  type UIMessage,
  convertToModelMessages,
  streamText,
  tool,
} from 'ai';
import { z } from 'zod';

export const runtime = 'edge';
export const maxDuration = 30;

// Define the tools with proper schemas
const tools = {
  executeCode: tool({
    description: 'Execute Python code in a sandboxed Modal environment with data science packages pre-installed. IMPORTANT: Always use print() statements to display results, outputs, DataFrames, calculations, etc. Without print(), the output will be empty.',
    inputSchema: z.object({
      code: z.string().describe('Python code to execute. MUST include print() statements to display all results and outputs.'),
      timeout: z.number()
        .min(1)
        .max(300)
        .optional()
        .default(30)
        .describe('Execution timeout in seconds'),
    }),
    execute: async ({ code, timeout }) => {
      console.log('Executing code via Modal server:', { codeLength: code.length, timeout });
      
      try {
        // Call the modal_server execute endpoint
        const response = await fetch(`${process.env.MODAL_BASE_URL || 'cooked'}/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            timeout,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Modal server error:', response.status, errorText);
          return {
            success: false,
            error: `Server error (${response.status}): ${errorText}`,
            output: '',
            execution_time: null,
          };
        }

        const result = await response.json();
        console.log('Execution result:', result);
        
        return {
          success: result.success,
          output: result.output || '',
          error: result.error || null,
          execution_time: result.execution_time || null,
          code: code, // Include the original code for display
        };
      } catch (error) {
        console.error('Failed to execute code:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to connect to execution server',
          output: '',
          execution_time: null,
          code: code,
        };
      }
    },
  }),
  
  analyzeCode: tool({
    description: 'Analyze Python code for potential issues or improvements',
    inputSchema: z.object({
      code: z.string().describe('Python code to analyze'),
    }),
    execute: async ({ code }) => {
      const lines = code.split('\n');
      const issues: string[] = [];
      const suggestions: string[] = [];
      
      // Basic static analysis
      if (!code.includes('import')) {
        suggestions.push('Consider adding necessary imports at the beginning');
      }
      
      if (code.includes('open(') && !code.includes('try:')) {
        issues.push('File operations should include error handling');
      }
      
      const hasPrint = code.includes('print(');
      const hasReturn = code.includes('return ');
      
      if (!hasPrint && !hasReturn) {
        issues.push('CRITICAL: No print() statements found! Code will execute but show no output. Add print() statements to display results.');
        suggestions.push('Add print() statements to display all important results, calculations, and DataFrame contents');
      } else if (!hasPrint) {
        suggestions.push('Consider adding print() statements in addition to return values for better visibility');
      }
      
      // Check for common pandas patterns
      if (code.includes('pandas') || code.includes('pd.')) {
        if (!code.includes('.head()') && !code.includes('.info()') && !code.includes('.describe()')) {
          suggestions.push('Consider using .head(), .info(), or .describe() to inspect DataFrames');
        }
      }
      
      return {
        lineCount: lines.length,
        hasImports: code.includes('import'),
        hasPrintStatements: hasPrint,
        hasReturnStatements: hasReturn,
        issues,
        suggestions,
        code: code,
      };
    },
  }),
} satisfies ToolSet;

// Export types for the client
export type ExecuteCodeTools = InferUITools<typeof tools>;
export type ExecuteCodeMessage = UIMessage<never, UIDataTypes, ExecuteCodeTools>;

export async function POST(request: Request) {
  const { messages }: { messages: ExecuteCodeMessage[] } = await request.json();

  console.log('Processing streaming request with messages:', messages.length);

  // Add system message to ensure proper code output
  const enhancedMessages = [
    {
      role: 'system' as const,
      content: 'When writing Python code, ALWAYS use print() statements to display all results, outputs, DataFrames, calculations, and any values the user would want to see. Without print(), the output will be empty. For DataFrames, use print(df) or print(df.head()). For calculations, use print(f"Result: {result}"). Make outputs clear and well-formatted.'
    },
    ...convertToModelMessages(messages)
  ];

  const result = streamText({
    model: qwenModel,
    messages: enhancedMessages,
    tools,
    temperature: 0.7,
    maxOutputTokens: 4000,
  });

  return result.toUIMessageStreamResponse();
}

// Health check endpoint
export async function GET() {
  try {
    console.log('Checking Modal server health...');
    
    const response = await fetch(`${process.env.MODAL_BASE_URL || 'cooked'}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        {
          available: false,
          error: `Server returned ${response.status}: ${errorText}`,
        },
        { status: 503 }
      );
    }

    const health = await response.json();
    console.log('Modal server health:', health);
    
    return Response.json({
      available: true,
      modalServerUrl: process.env.MODAL_BASE_URL || 'cooked',
      health,
    });
  } catch (error) {
    console.error('Failed to check Modal server:', error);
    return Response.json(
      {
        available: false,
        error: error instanceof Error ? error.message : 'Failed to connect to Modal server',
      },
      { status: 503 }
    );
  }
}

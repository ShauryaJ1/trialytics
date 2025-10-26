import { generateText, tool } from 'ai';
import { qwenModel } from '@/lib/ai-provider';
import { z } from 'zod';

export const runtime = 'edge';
export const maxDuration = 30;

// Define the code execution tool that calls the modal_server
const executeCodeTool = tool({
  description: 'Execute Python code in a sandboxed Modal environment with data science packages pre-installed (pandas, numpy, scipy, matplotlib, seaborn, etc.). IMPORTANT: Always use print() statements to display results, outputs, DataFrames, calculations, etc. Without print(), the output will be empty.',
  inputSchema: z.object({
    code: z.string().describe('Python code to execute. MUST include print() statements to display all results and outputs.'),
    timeout: z.number()
      .min(1)
      .max(300)
      .optional()
      .default(30)
      .describe('Execution timeout in seconds (1-300)'),
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
        };
      }

      const result = await response.json();
      console.log('Execution result:', result);
      
      return result;
    } catch (error) {
      console.error('Failed to execute code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to execution server',
      };
    }
  },
});

// Additional utility tools that might be useful for code generation and analysis
const analyzeCodeTool = tool({
  description: 'Analyze Python code for potential issues or improvements',
  inputSchema: z.object({
    code: z.string().describe('Python code to analyze'),
  }),
  execute: async ({ code }) => {
    // Basic static analysis (can be enhanced with actual linting)
    const lines = code.split('\n');
    const issues = [];
    const suggestions = [];
    
    // Check for common issues
    if (!code.includes('import')) {
      suggestions.push('Consider adding necessary imports at the beginning');
    }
    
    // Check for basic error handling
    if (code.includes('open(') && !code.includes('try:')) {
      issues.push('File operations should include error handling');
    }
    
    // Check for print statements vs return values
    const hasPrint = code.includes('print(');
    const hasReturn = code.includes('return ');
    
    if (!hasPrint && !hasReturn) {
      issues.push('CRITICAL: No print() statements found! Code will execute but show no output. Add print() statements to display results.');
      suggestions.push('Add print() statements to display all important results, calculations, and DataFrame contents');
    } else if (!hasPrint) {
      suggestions.push('Consider adding print() statements in addition to return values for better visibility');
    }
    
    return {
      lineCount: lines.length,
      hasImports: code.includes('import'),
      hasPrintStatements: hasPrint,
      hasReturnStatements: hasReturn,
      issues,
      suggestions,
    };
  },
});


export async function POST(req: Request) {
  try {
    const { prompt, includeExamples = false } = await req.json();

    console.log('Processing prompt with code execution tools:', prompt);

    // Prepare the enhanced prompt with print() instructions
    let enhancedPrompt = `${prompt}\n\nIMPORTANT: When writing Python code, ALWAYS use print() statements to display all results, outputs, DataFrames, calculations, and any values. Without print(), the output will be empty. For DataFrames, use print(df) or print(df.head()). For calculations, use print(f"Result: {result}"). Make outputs clear and well-formatted.`;
    
    if (includeExamples) {
      enhancedPrompt += `\n\nNote: You can use the executeCode tool to run Python code in a sandboxed environment.`;
    }

    // Generate text with code execution capabilities
    const { text, toolCalls, toolResults, usage } = await generateText({
      model: qwenModel,
      prompt: enhancedPrompt,
      tools: {
        executeCode: executeCodeTool,
        analyzeCode: analyzeCodeTool,
      },
      toolChoice: 'auto', // Let the model decide which tools to use
      temperature: 0.7,
      maxOutputTokens: 4000,
    });

    console.log('Generated text:', text);
    console.log('Tool calls:', toolCalls?.length || 0, 'calls');
    console.log('Tool results:', toolResults);

    return Response.json({
      text,
      toolCalls,
      toolResults,
      usage,
    });
  } catch (error) {
    console.error('Code execution tool error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process code execution request';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// GET endpoint to check if the Modal server is available
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

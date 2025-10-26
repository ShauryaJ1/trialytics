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
  
  displayTable: tool({
    description: 'Display data in a formatted table with borders and dividers. Use this to show structured data, results, comparisons, or any tabular information.',
    inputSchema: z.object({
      headers: z.array(z.string()).describe('Column headers for the table'),
      rows: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
        .describe('Table rows, each row is an array of cell values'),
      caption: z.string().optional().describe('Optional caption for the table'),
      alignment: z.array(z.enum(['left', 'center', 'right'])).optional()
        .describe('Optional alignment for each column (defaults to left)'),
    }),
    execute: async ({ headers, rows, caption, alignment }) => {
      // Validate that all rows have the same number of columns as headers
      const columnCount = headers.length;
      const validRows = rows.every(row => row.length === columnCount);
      
      if (!validRows) {
        return {
          success: false,
          error: 'All rows must have the same number of columns as headers',
          headers,
          rows,
          caption,
          alignment,
        };
      }
      
      // Convert all values to strings for display
      const formattedRows = rows.map(row => 
        row.map(cell => cell === null ? '' : String(cell))
      );
      
      return {
        success: true,
        headers,
        rows: formattedRows,
        caption,
        alignment: alignment || headers.map(() => 'left' as const),
        rowCount: rows.length,
        columnCount,
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

  // Add comprehensive system message about available tools and Modal environment
  const enhancedMessages = [
    {
      role: 'system' as const,
      content: `You are an AI coding assistant with access to several powerful tools. Here's what you can do:

## Available Tools:

### 1. executeCode
- Executes Python code in a sandboxed Modal environment
- Has common data science packages pre-installed (pandas, numpy, scipy, matplotlib, seaborn, scikit-learn, requests, beautifulsoup4, etc.)
- IMPORTANT: Always use print() statements to display ALL results, outputs, DataFrames, and calculations
- Without print(), the output will be empty
- For DataFrames: use print(df) or print(df.head())
- For calculations: use print(f"Result: {result}")
- Maximum timeout: 300 seconds
- You can always add print statements to get the outputs of the execution, for example the mean of a column in a dataset, or things like that

### 2. displayTable
- Creates beautifully formatted tables with borders and dividers
- Use this for displaying structured data, comparisons, or any tabular information
- Provides proper column alignment and visual separation
- Ideal for presenting analysis results, comparisons between items, or data summaries
- Supports captions and custom column alignments (left, center, right)

## Important Notes:

### Modal Environment Limitations:
- The Python code runs in an isolated Modal container
- The tools (executeCode, displayTable) are NOT available inside the Python code. They aren't python functions, they are tools for you to use
- You cannot call these tools from within the Python code itself
- Instead, use these tools sequentially: first execute code to get data, then use displayTable to show results nicely

### Best Practices:
1. When analyzing data: First execute Python code to process data, then use displayTable to present results
2. Always include print() statements in Python code for visibility
3. Use displayTable for final presentation of structured results, comparisons, or summaries
4. Break complex tasks into steps: data processing (executeCode) → presentation (displayTable)
5. You can pass the output of one tool to the input of another tool, for example you can pass the output of executeCode to the input of displayTable
### Example Workflow:
1. User asks for data analysis
2. Use executeCode to process data with Python (with print statements for intermediate results)
3. Use displayTable to present final results in a clean, formatted table

Remember: The tools enhance your capabilities but work independently. Plan your approach to use each tool effectively for the best results.`
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

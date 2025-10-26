import { generateText, tool } from 'ai';
import { qwenModel } from '@/lib/ai-provider';
import { z } from 'zod';

export const runtime = 'edge';
export const maxDuration = 30;

// Define the code execution tool that calls the modal_server
const executeCodeTool = tool({
  description: 'Execute Python code in a sandboxed Modal environment with data science packages pre-installed (pandas, numpy, scipy, matplotlib, seaborn, etc.)',
  inputSchema: z.object({
    code: z.string().describe('Python code to execute'),
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
      const response = await fetch('http://3.212.17.117:8000/execute', {
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
      suggestions.push('Consider adding print statements or return values to show results');
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

const getExamplesTool = tool({
  description: 'Get example Python code snippets for common data science tasks',
  inputSchema: z.object({
    category: z.enum(['basic', 'numpy', 'pandas', 'visualization', 'web_scraping', 'all'])
      .optional()
      .default('all')
      .describe('Category of examples to retrieve'),
  }),
  execute: async ({ category }) => {
    const examples: Record<string, any> = {
      basic: {
        name: 'Hello World',
        code: `print('Hello from Modal!')
print(f'Python execution successful at {__import__("datetime").datetime.now()}')`,
      },
      numpy: {
        name: 'NumPy Array Operations',
        code: `import numpy as np

# Create random array
arr = np.random.randn(5, 3)
print(f'Array shape: {arr.shape}')
print(f'Array mean: {arr.mean():.3f}')
print(f'Array std: {arr.std():.3f}')

# Matrix operations
result = arr.T @ arr
print(f'\\nMatrix multiplication result shape: {result.shape}')`,
      },
      pandas: {
        name: 'Pandas DataFrame Analysis',
        code: `import pandas as pd
import numpy as np

# Create sample DataFrame
df = pd.DataFrame({
    'A': np.random.randn(10),
    'B': np.random.randn(10),
    'C': np.random.choice(['X', 'Y', 'Z'], 10),
    'D': pd.date_range('2024-01-01', periods=10)
})

print('DataFrame info:')
print(df.info())
print('\\nDataFrame description:')
print(df.describe())
print('\\nValue counts for C:')
print(df['C'].value_counts())
print('\\nGrouped statistics:')
print(df.groupby('C')[['A', 'B']].mean())`,
      },
      visualization: {
        name: 'Data Visualization',
        code: `import matplotlib.pyplot as plt
import numpy as np
import io
import base64

# Create sample data
x = np.linspace(0, 10, 100)
y1 = np.sin(x)
y2 = np.cos(x)

# Create plot
plt.figure(figsize=(10, 6))
plt.plot(x, y1, label='sin(x)', linewidth=2)
plt.plot(x, y2, label='cos(x)', linewidth=2)
plt.xlabel('x')
plt.ylabel('y')
plt.title('Trigonometric Functions')
plt.legend()
plt.grid(True, alpha=0.3)

# Save to buffer and encode as base64
buf = io.BytesIO()
plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
buf.seek(0)
img_base64 = base64.b64encode(buf.read()).decode('utf-8')
plt.close()

print('Plot generated successfully!')
print(f'Image size: {len(img_base64)} bytes (base64 encoded)')
print('To view the plot, decode the base64 string.')`,
      },
      web_scraping: {
        name: 'Web Scraping',
        code: `import requests
from bs4 import BeautifulSoup

# Fetch a simple HTML page
response = requests.get('https://httpbin.org/html')
soup = BeautifulSoup(response.text, 'html.parser')

# Extract information
title = soup.find('h1')
paragraphs = soup.find_all('p')

print(f'Page Title: {title.text if title else "No title found"}')
print(f'Number of paragraphs: {len(paragraphs)}')
print('\\nFirst paragraph:')
print(paragraphs[0].text if paragraphs else 'No paragraphs found')`,
      },
    };
    
    if (category === 'all') {
      return Object.values(examples);
    }
    
    return examples[category] || examples.basic;
  },
});

export async function POST(req: Request) {
  try {
    const { prompt, includeExamples = false } = await req.json();

    console.log('Processing prompt with code execution tools:', prompt);

    // Prepare the enhanced prompt if examples are requested
    let enhancedPrompt = prompt;
    if (includeExamples) {
      enhancedPrompt = `${prompt}\n\nNote: You can use the getExamples tool to see example code snippets, and the executeCode tool to run Python code in a sandboxed environment.`;
    }

    // Generate text with code execution capabilities
    const { text, toolCalls, toolResults, usage } = await generateText({
      model: qwenModel,
      prompt: enhancedPrompt,
      tools: {
        executeCode: executeCodeTool,
        analyzeCode: analyzeCodeTool,
        getExamples: getExamplesTool,
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
    
    const response = await fetch('http://3.212.17.117:8000/health', {
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
      modalServerUrl: 'http://3.212.17.117:8000',
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

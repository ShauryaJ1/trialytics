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
    description: 'Execute Python code in a sandboxed Modal environment with data science packages pre-installed',
    inputSchema: z.object({
      code: z.string().describe('Python code to execute'),
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
        suggestions.push('Consider adding print statements or return values to show results');
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
  
  getExamples: tool({
    description: 'Get example Python code snippets for common data science tasks',
    inputSchema: z.object({
      category: z.enum(['basic', 'numpy', 'pandas', 'visualization', 'web_scraping', 'machine_learning'])
        .optional()
        .default('basic')
        .describe('Category of examples to retrieve'),
    }),
    execute: async ({ category }) => {
      const examples: Record<string, any> = {
        basic: {
          name: 'Hello World & Basic Operations',
          code: `# Basic Python operations
print('Hello from Modal!')
print(f'Python execution at {__import__("datetime").datetime.now()}')

# Simple calculations
result = sum(range(1, 11))
print(f'Sum of 1 to 10: {result}')`,
        },
        numpy: {
          name: 'NumPy Array Operations',
          code: `import numpy as np

# Create and manipulate arrays
arr = np.random.randn(5, 3)
print(f'Array shape: {arr.shape}')
print(f'Array mean: {arr.mean():.3f}')
print(f'Array std: {arr.std():.3f}')

# Matrix operations
result = arr.T @ arr
print(f'\\nMatrix multiplication result shape: {result.shape}')
print('First row of result:', result[0])`,
        },
        pandas: {
          name: 'Pandas DataFrame Analysis',
          code: `import pandas as pd
import numpy as np

# Create sample DataFrame
df = pd.DataFrame({
    'Product': ['A', 'B', 'C', 'D', 'E'] * 20,
    'Quantity': np.random.randint(1, 100, 100),
    'Price': np.random.uniform(10, 100, 100),
    'Date': pd.date_range('2024-01-01', periods=100)
})

# Add revenue column
df['Revenue'] = df['Quantity'] * df['Price']

print('DataFrame Info:')
print(df.info())
print('\\nFirst 5 rows:')
print(df.head())
print('\\nStatistical Summary:')
print(df.describe())
print('\\nRevenue by Product:')
print(df.groupby('Product')['Revenue'].sum().sort_values(ascending=False))`,
        },
        visualization: {
          name: 'Data Visualization with Matplotlib',
          code: `import matplotlib.pyplot as plt
import numpy as np
import io
import base64

# Create sample data
x = np.linspace(0, 10, 100)
y1 = np.sin(x)
y2 = np.cos(x)
y3 = np.sin(x) * np.cos(x)

# Create subplots
fig, axes = plt.subplots(2, 2, figsize=(10, 8))
fig.suptitle('Mathematical Functions', fontsize=16)

# Plot 1: Sine wave
axes[0, 0].plot(x, y1, 'b-', linewidth=2)
axes[0, 0].set_title('Sine Wave')
axes[0, 0].grid(True, alpha=0.3)

# Plot 2: Cosine wave
axes[0, 1].plot(x, y2, 'r-', linewidth=2)
axes[0, 1].set_title('Cosine Wave')
axes[0, 1].grid(True, alpha=0.3)

# Plot 3: Combined
axes[1, 0].plot(x, y3, 'g-', linewidth=2)
axes[1, 0].set_title('Sin(x) * Cos(x)')
axes[1, 0].grid(True, alpha=0.3)

# Plot 4: All together
axes[1, 1].plot(x, y1, 'b-', label='sin(x)', alpha=0.7)
axes[1, 1].plot(x, y2, 'r-', label='cos(x)', alpha=0.7)
axes[1, 1].plot(x, y3, 'g-', label='sin(x)*cos(x)', alpha=0.7)
axes[1, 1].set_title('All Functions')
axes[1, 1].legend()
axes[1, 1].grid(True, alpha=0.3)

plt.tight_layout()

# Save to buffer and encode as base64
buf = io.BytesIO()
plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
buf.seek(0)
img_base64 = base64.b64encode(buf.read()).decode('utf-8')
plt.close()

print('Plot generated successfully!')
print(f'Image size: {len(img_base64)} bytes (base64 encoded)')`,
        },
        web_scraping: {
          name: 'Web Scraping Example',
          code: `import requests
from bs4 import BeautifulSoup
import json

# Fetch JSON data from API
api_response = requests.get('https://httpbin.org/json')
data = api_response.json()
print('JSON API Response:')
print(json.dumps(data, indent=2))

# Scrape HTML content
html_response = requests.get('https://httpbin.org/html')
soup = BeautifulSoup(html_response.text, 'html.parser')

# Extract information
title = soup.find('h1')
paragraphs = soup.find_all('p')

print(f'\\nPage Title: {title.text if title else "No title found"}')
print(f'Number of paragraphs: {len(paragraphs)}')
print('\\nParagraph texts:')
for i, p in enumerate(paragraphs[:3], 1):
    print(f'{i}. {p.text[:100]}...' if len(p.text) > 100 else f'{i}. {p.text}')`,
        },
        machine_learning: {
          name: 'Simple Machine Learning Example',
          code: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# Generate synthetic dataset
X, y = make_classification(
    n_samples=1000,
    n_features=20,
    n_informative=15,
    n_redundant=5,
    n_classes=2,
    random_state=42
)

# Split the data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42
)

# Train a Random Forest classifier
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)

# Make predictions
y_pred = clf.predict(X_test)

# Evaluate the model
accuracy = accuracy_score(y_test, y_pred)
print(f'Model Accuracy: {accuracy:.4f}')
print('\\nClassification Report:')
print(classification_report(y_test, y_pred))

# Feature importance
feature_importance = clf.feature_importances_
top_features = np.argsort(feature_importance)[-5:][::-1]
print('\\nTop 5 Important Features:')
for i, idx in enumerate(top_features, 1):
    print(f'{i}. Feature {idx}: {feature_importance[idx]:.4f}')`,
        },
      };
      
      return {
        category,
        example: examples[category] || examples.basic,
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

  const result = streamText({
    model: qwenModel,
    messages: convertToModelMessages(messages),
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

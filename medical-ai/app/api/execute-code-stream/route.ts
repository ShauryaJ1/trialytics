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
  
  displayBarChart: tool({
    description: 'Display data as a bar chart. Use for comparing quantities across categories, showing distributions, or visualizing grouped data.',
    inputSchema: z.object({
      labels: z.array(z.string()).describe('X-axis labels for each bar or group of bars'),
      datasets: z.array(z.object({
        label: z.string().describe('Label for this dataset in the legend'),
        data: z.array(z.number()).describe('Numeric values for each bar'),
        backgroundColor: z.union([z.string(), z.array(z.string())]).optional()
          .describe('Background color(s) for the bars'),
        borderColor: z.union([z.string(), z.array(z.string())]).optional()
          .describe('Border color(s) for the bars'),
      })).describe('One or more datasets to display'),
      title: z.string().optional().describe('Chart title'),
      description: z.string().optional().describe('Chart description'),
      stacked: z.boolean().optional().default(false)
        .describe('Stack bars on top of each other'),
      horizontal: z.boolean().optional().default(false)
        .describe('Display as horizontal bar chart'),
    }),
    execute: async ({ labels, datasets, title, description, stacked, horizontal }) => {
      return {
        success: true,
        type: 'bar' as const,
        data: { labels, datasets },
        title,
        description,
        config: { stacked, horizontal },
      };
    },
  }),
  
  displayPieChart: tool({
    description: 'Display data as a pie chart. Use for showing proportions, percentages, or parts of a whole.',
    inputSchema: z.object({
      labels: z.array(z.string()).describe('Labels for each slice of the pie'),
      data: z.array(z.number()).describe('Numeric values for each slice'),
      title: z.string().optional().describe('Chart title'),
      description: z.string().optional().describe('Chart description'),
      isDoughnut: z.boolean().optional().default(false)
        .describe('Display as doughnut chart instead of pie'),
      backgroundColor: z.array(z.string()).optional()
        .describe('Background colors for each slice'),
    }),
    execute: async ({ labels, data, title, description, isDoughnut, backgroundColor }) => {
      return {
        success: true,
        type: 'pie' as const,
        data: { 
          labels, 
          datasets: [{
            data,
            backgroundColor,
          }],
        },
        title,
        description,
        config: { isDoughnut },
      };
    },
  }),
  
  displayLineChart: tool({
    description: 'Display data as a line chart. Use for showing trends over time, continuous data, or relationships between variables.',
    inputSchema: z.object({
      labels: z.array(z.string()).describe('X-axis labels (e.g., time points, categories)'),
      datasets: z.array(z.object({
        label: z.string().describe('Label for this line in the legend'),
        data: z.array(z.number()).describe('Y-axis values for each point'),
        borderColor: z.string().optional().describe('Color of the line'),
        backgroundColor: z.string().optional().describe('Fill color under the line'),
        tension: z.number().min(0).max(1).optional()
          .describe('Line smoothness (0 for straight lines, 0.4 for smooth curves)'),
      })).describe('One or more line datasets to display'),
      title: z.string().optional().describe('Chart title'),
      description: z.string().optional().describe('Chart description'),
      smooth: z.boolean().optional().default(true)
        .describe('Use smooth curves instead of straight lines'),
      area: z.boolean().optional().default(false)
        .describe('Fill area under the line'),
    }),
    execute: async ({ labels, datasets, title, description, smooth, area }) => {
      return {
        success: true,
        type: 'line' as const,
        data: { labels, datasets },
        title,
        description,
        config: { smooth, area },
      };
    },
  }),
  
  displayScatterChart: tool({
    description: 'Display data as a scatter plot. Use for showing correlations, distributions in 2D space, or relationships between two numeric variables.',
    inputSchema: z.object({
      datasets: z.array(z.object({
        label: z.string().describe('Label for this dataset in the legend'),
        data: z.array(z.object({
          x: z.number().describe('X-coordinate'),
          y: z.number().describe('Y-coordinate'),
        })).describe('Array of (x, y) coordinate pairs'),
        backgroundColor: z.string().optional().describe('Color for the points'),
        pointRadius: z.number().optional().describe('Size of the points'),
      })).describe('One or more datasets of points to display'),
      title: z.string().optional().describe('Chart title'),
      description: z.string().optional().describe('Chart description'),
      showTrendline: z.boolean().optional().default(false)
        .describe('Display a linear trendline for the first dataset'),
    }),
    execute: async ({ datasets, title, description, showTrendline }) => {
      return {
        success: true,
        type: 'scatter' as const,
        data: { datasets },
        title,
        description,
        config: { showTrendline },
      };
    },
  }),
} satisfies ToolSet;

// Export types for the client
export type ExecuteCodeTools = InferUITools<typeof tools>;
export type ExecuteCodeMessage = UIMessage<never, UIDataTypes, ExecuteCodeTools>;

export async function POST(request: Request) {
  const { messages }: { 
    messages: ExecuteCodeMessage[];
  } = await request.json();

  console.log('Processing streaming request with messages:', messages.length);

  // Add comprehensive system message about available tools and Modal environment
  const enhancedMessages = [
    {
      role: 'system' as const,
      content: `You are an AI coding assistant with access to several powerful tools. Here's what you can do:

## Available Tools:

### 1. executeCode
- Executes Python code in a sandboxed Modal environment
- Has common data science packages pre-installed (pandas, numpy, scipy, matplotlib, seaborn, scikit-learn, requests, beautifulsoup4, PyPDF2, pyreadstat, pdfplumber, etc.)
- IMPORTANT: Always use print() statements to display ALL results, outputs, DataFrames, and calculations
- Without print(), the output will be empty
- For DataFrames: use print(df) or print(df.head())
- For calculations: use print(f"Result: {result}")
- Maximum timeout: 300 seconds
- You can always add print statements to get the outputs of the execution, for example the mean of a column in a dataset, or things like that
- Can load files from S3 using presigned URLs with requests library
- never assume the structure of the data, always explore the data with executeCode first
- if you are given an xpt file use pandas.read_sas like df = pd.read_sas("/content/adadas.xpt", format="xport")
### XPT FILES:
use code like the following to load an xpt file:

import requests
import pandas as pd
import io

url_1 = "<your url>"
response = requests.get(url_1)
content = response.content

# Convert bytes to file-like object
file_like = io.BytesIO(content)

df = pd.read_sas(file_like, format="xport")

print("\nFirst few rows of the data:")
print(df.head())

print("\nShape of the DataFrame (rows, columns):")
print(df.shape)

print("\nColumn names:")
print(df.columns)

print("\nData types of each column:")
print(df.dtypes)

print("\nSummary statistics:")
print(df.describe())
### 2. displayTable
- Creates beautifully formatted tables with borders and dividers
- Use this for displaying structured data, comparisons, or any tabular information
- Provides proper column alignment and visual separation
- Ideal for presenting analysis results, comparisons between items, or data summaries
- Supports captions and custom column alignments (left, center, right)
- When you call this tool, DO NOT MAKE ANOTHER TABLE WITH MARKDOWN FORMAT

### 3. displayBarChart
- Creates interactive bar charts for comparing quantities across categories
- Supports multiple datasets for grouped comparisons
- Options: stacked bars, horizontal orientation
- Perfect for comparing values, showing distributions, or visualizing categorical data

### 4. displayPieChart
- Creates pie or doughnut charts for showing proportions and percentages
- Automatically calculates and displays percentages
- Best for visualizing parts of a whole, market share, or composition data
- Supports custom colors for each slice

### 5. displayLineChart
- Creates line charts for showing trends over time or continuous data
- Supports multiple lines for comparing trends
- Options: smooth curves, filled areas under lines
- Ideal for time series data, growth trends, or continuous relationships

### 6. displayScatterChart
- Creates scatter plots for showing correlations and distributions
- Supports multiple datasets with different colors
- Optional trendline to visualize linear relationships
- Perfect for exploring relationships between two numeric variables


## Important Notes:
### File Uploads:
IT IS VITAL THAT YOU EXPLORE THE DATA BEFORE YOU TRY TO RUN OPERATIONS ON IT. USE executeCode TO EXPLORE THE DATA.
### Modal Environment Limitations:
- The Python code runs in an isolated Modal container
- The tools (executeCode, displayTable) are NOT available inside the Python code. They aren't python functions, they are tools for you to use
- You cannot call these tools from within the Python code itself
- Instead, use these tools sequentially: first execute code to get data, then use displayTable to show results nicely

### Best Practices:
1. When analyzing data: First execute Python code to process data, then use displayTable or chart tools to present results
2. Always include print() statements in Python code for visibility
3. Use displayTable for tabular data, and chart tools for visual representations
4. Break complex tasks into steps: data processing (executeCode) → visualization (charts/tables)
5. You can pass the output of one tool to the input of another tool
6. When given a file with data, start by exploring the data with executeCode
7. Choose the right visualization:
   - Bar charts: Comparing categories, showing distributions
   - Pie charts: Showing proportions or percentages of a whole
   - Line charts: Time series data, trends over time
   - Scatter plots: Correlations, relationships between variables
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


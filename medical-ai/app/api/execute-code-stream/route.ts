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
      // Generate a unique chart ID for referencing in reports
      const chartId = `bar_chart_${Date.now()}`;
      
      // Ensure labels are properly formatted
      const validLabels = labels && labels.length > 0 
        ? labels 
        : datasets[0]?.data?.map((_, index) => `Item ${index + 1}`) || [];
      
      // Ensure datasets have proper labels
      const validDatasets = datasets.map((dataset, index) => ({
        ...dataset,
        label: dataset.label || `Dataset ${index + 1}`,
        data: dataset.data || [],
      }));
      
      return {
        success: true,
        type: 'bar' as const,
        data: { 
          labels: validLabels, 
          datasets: validDatasets 
        },
        title,
        description,
        config: { stacked, horizontal },
        chartId, // For report referencing
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
      const chartId = `pie_chart_${Date.now()}`;
      
      // Ensure labels are properly formatted
      const validLabels = labels && labels.length > 0 
        ? labels 
        : data.map((_, index) => `Category ${index + 1}`);
      
      return {
        success: true,
        type: 'pie' as const,
        data: { 
          labels: validLabels, 
          datasets: [{
            label: title || 'Dataset 1', // Add the required label property
            data: data || [],
            backgroundColor: backgroundColor || [
              'rgba(255, 99, 132, 0.8)',
              'rgba(54, 162, 235, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(153, 102, 255, 0.8)',
              'rgba(255, 159, 64, 0.8)',
            ],
          }],
        },
        title,
        description,
        config: { isDoughnut },
        chartId,
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
      const chartId = `line_chart_${Date.now()}`;
      
      // Ensure labels are properly formatted
      const validLabels = labels && labels.length > 0 
        ? labels 
        : datasets[0]?.data?.map((_, index) => `Point ${index + 1}`) || [];
      
      // Ensure datasets have proper structure
      const validDatasets = datasets.map((dataset, index) => ({
        ...dataset,
        label: dataset.label || `Series ${index + 1}`,
        data: dataset.data || [],
        tension: smooth ? (dataset.tension ?? 0.4) : 0,
        fill: area ? 'origin' : false,
      }));
      
      return {
        success: true,
        type: 'line' as const,
        data: { 
          labels: validLabels, 
          datasets: validDatasets 
        },
        title,
        description,
        config: { smooth, area },
        chartId,
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
      const chartId = `scatter_chart_${Date.now()}`;
      
      // Ensure datasets have proper structure for scatter charts
      const validDatasets = datasets.map((dataset, index) => ({
        ...dataset,
        label: dataset.label || `Dataset ${index + 1}`,
        data: dataset.data || [],
        pointRadius: dataset.pointRadius ?? 5,
      }));
      
      return {
        success: true,
        type: 'scatter' as const,
        data: { 
          datasets: validDatasets 
        },
        title,
        description,
        config: { showTrendline },
        chartId,
      };
    },
  }),
  
  generateMarkdownReport: tool({
    description: `Generate a professional markdown report with visualizations. ALWAYS call this at the END of your analysis.

REPORT STRUCTURE TEMPLATE:
1. Executive Summary - Key findings in 2-3 sentences
2. Data Overview - What data was analyzed
3. Methodology - How the analysis was performed
4. Results - Key findings with visualizations
5. Statistical Analysis - Detailed statistics
6. Visualizations - Charts with interpretations
7. Conclusion - Summary and recommendations

EXAMPLE SECTIONS FORMAT:
{
  title: "Clinical Trial Data Analysis Report",
  executiveSummary: "Analysis of 30 patients reveals strong correlations between cardiovascular parameters. Heart rate shows 98% correlation with blood pressure measurements.",
  sections: [
    {
      heading: "Data Overview",
      content: "Analyzed medical records from 30 patients including vital signs, BMI, and blood pressure readings collected over 6 months.",
      level: 2
    },
    {
      heading: "Key Findings",
      content: "### Statistical Summary\\n- Mean Heart Rate: 72 bpm\\n- Mean Systolic BP: 120 mmHg\\n\\n![bar_chart_123456789]\\n\\nThe bar chart above shows distribution of values...",
      level: 2
    }
  ],
  chartData: [
    {
      chartId: "bar_chart_123456789",
      type: "bar",
      data: { labels: [...], datasets: [...] },
      title: "Patient Metrics Distribution"
    }
  ],
  conclusion: "The analysis demonstrates significant relationships requiring further investigation.",
  metadata: {
    analysisType: "Correlation and Descriptive Statistics",
    dataSource: "Medical CSV File"
  }
}`,
    inputSchema: z.object({
      title: z.string().describe('Professional report title (e.g., "Clinical Trial Statistical Analysis Report")'),
      sections: z.array(z.object({
        heading: z.string().describe('Section heading (e.g., "Data Overview", "Methodology", "Results")'),
        content: z.string().describe('Section content in markdown. Use ![chartId] to reference charts. Include interpretations after each chart reference.'),
        level: z.number().min(1).max(3).optional().default(2)
          .describe('Heading level (2 for main sections, 3 for subsections)'),
      })).describe('Report sections in order. MUST include: Data Overview, Methodology, Results, and Visualizations sections'),
      chartData: z.array(z.object({
        chartId: z.string().describe('The EXACT chartId returned from chart creation tools'),
        type: z.enum(['bar', 'pie', 'line', 'scatter']).describe('Type of chart'),
        data: z.any().describe('The EXACT data object returned from chart tools'),
        title: z.string().optional().describe('Chart title'),
        config: z.any().optional().describe('The EXACT config object from chart tools'),
      })).optional().describe('CRITICAL: Include ALL charts created during analysis. Copy chartId, data, and config EXACTLY as returned from chart tools'),
      executiveSummary: z.string().optional()
        .describe('2-3 sentence executive summary highlighting the most important findings'),
      conclusion: z.string().optional()
        .describe('Concluding paragraph with key takeaways and recommendations'),
      metadata: z.object({
        analysisType: z.string().optional().describe('Type of analysis (e.g., "Descriptive Statistics", "Correlation Analysis")'),
        dataSource: z.string().optional().describe('Source of data (e.g., "Patient Medical Records CSV")'),
      }).optional().describe('Report metadata'),
    }),
    execute: async ({ title, sections, chartData, executiveSummary, conclusion, metadata }) => {
      // Build the markdown content
      let markdownContent = '';
      
      // Add executive summary if provided
      if (executiveSummary) {
        markdownContent += '## Executive Summary\n\n';
        markdownContent += executiveSummary + '\n\n';
        markdownContent += '---\n\n';
      }
      
      // Add main sections
      sections.forEach(section => {
        const headingPrefix = '#'.repeat(section.level || 2);
        markdownContent += `${headingPrefix} ${section.heading}\n\n`;
        markdownContent += section.content + '\n\n';
      });
      
      // Add conclusion if provided
      if (conclusion) {
        markdownContent += '---\n\n';
        markdownContent += '## Conclusion\n\n';
        markdownContent += conclusion + '\n\n';
      }
      
      // Add metadata
      const reportMetadata = {
        generatedAt: new Date().toLocaleString(),
        ...metadata,
      };
      
      return {
        success: true,
        content: markdownContent,
        title,
        description: executiveSummary ? executiveSummary.substring(0, 150) + '...' : 'Statistical Analysis Report',
        metadata: reportMetadata,
        chartData: chartData || [],
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
      content: `You are an AI coding assistant specializing in medical data analysis and visualization.

## 🚨 CRITICAL REQUIREMENT - TOOL EXECUTION ORDER 🚨
**YOU MUST ALWAYS CALL executeCode BEFORE ANY CHART DISPLAY TOOLS!**

This is an absolute requirement. The chart tools (displayBarChart, displayPieChart, displayLineChart, displayScatterChart) require data that MUST be obtained through executeCode first. 

### ✅ CORRECT WORKFLOW:
1. FIRST: Use executeCode to load/process data and print it as Python lists
2. THEN: Use chart display tools with the data from executeCode output

### ❌ INCORRECT (This will fail):
- Calling chart tools without first executing code to get the data
- Trying to create charts directly without data preparation

## Available Tools (Use in Proper Order):

### 1. executeCode (PRIMARY TOOL - MUST BE USED FIRST)
**THIS IS YOUR PRIMARY DATA PROCESSING TOOL - ALWAYS USE BEFORE CHARTS!**
- Executes Python code in a sandboxed Modal environment
- Has extensive data science packages pre-installed:
  - Data: pandas, numpy, scipy, pyreadstat
  - File handling: requests, beautifulsoup4, PyPDF2, pdfplumber
- ALWAYS USE THE USE THE URL TO LOAD THE FILES NOT THE FILE ITSELF
  
#### CRITICAL REQUIREMENTS:
- ⚠️ MUST use print() statements to display ALL results - without print(), output is empty!
- ⚠️ MUST be called BEFORE any chart display tools to prepare data
- ⚠️ MUST print data as Python lists for chart tools to consume

#### Key Usage:
- For DataFrames: \`print(df)\` or \`print(df.head())\`
- For chart data: \`print(list(df['column']))\` to get lists for charts
- For calculations: \`print(f"Result: {result}")\`
- For S3 files: Use presigned URLs with requests library
- For XPT files: Use \`pd.read_sas(file_like, format="xport")\`
- Maximum timeout: 300 seconds

#### Remember:
- ALWAYS explore data structure first with executeCode
- NEVER assume data structure - always verify using executeCode
- USE ITERATIVELY to explore and process data
- ALWAYS show plots with displayChart tools NOT matplotlib or python code

#### Example: Loading XPT Files
\`\`\`python
import requests
import pandas as pd
import io

url = "<your_url>"
response = requests.get(url)
content = response.content

# Convert to file-like object and read
file_like = io.BytesIO(content)
df = pd.read_sas(file_like, format="xport")

# Always explore the data structure
print("\\nFirst few rows:")
print(df.head())
print(f"\\nShape: {df.shape}")
print(f"\\nColumns: {list(df.columns)}")
print("\\nData types:")
print(df.dtypes)
print("\\nSummary statistics:")
print(df.describe())
\`\`\`

### 2. displayTable (For Formatted Output)
- Creates beautifully formatted tables with borders and dividers
- Use AFTER executeCode to display processed results in clean format
- Provides proper column alignment and visual separation
- Ideal for presenting analysis results, comparisons, or data summaries
- Supports captions and custom column alignments
- Note: When using this tool, don't create duplicate markdown tables

## 📊 CHART TOOLS (REQUIRE executeCode FIRST!)

### ⚠️ MANDATORY FOR ALL CHARTS BELOW:
**YOU MUST CALL executeCode FIRST to prepare data as Python lists!**
**Charts CANNOT work without data from executeCode output!**

### 3. displayBarChart
**PRE-REQUISITE: ✅ Call executeCode FIRST to get data as lists!**
- Creates interactive bar charts for comparing quantities
- Required executeCode preparation: Print category labels and values as lists
- Example prep: \`print(list(df['categories']))\` and \`print(list(df['values']))\`
- Supports: multiple datasets, stacked bars, horizontal orientation
- Use for: comparing values, distributions, categorical data
- **IMPORTANT**: Save the returned chartId, data, title, and config for the report!

### 4. displayPieChart  
**PRE-REQUISITE: ✅ Call executeCode FIRST to calculate percentages!**
- Creates pie/doughnut charts for proportions
- Required executeCode preparation: Print labels and calculated percentages as lists
- Example prep: Calculate percentages in executeCode, then print as lists
- Automatically displays percentages in chart
- Use for: parts of a whole, composition data, market share

### 5. displayLineChart
**PRE-REQUISITE: ✅ Call executeCode FIRST to get time series data!**
- Creates line charts for trends over time
- Required executeCode preparation: Print x-axis labels and y-values as lists
- Example prep: \`print(list(df['dates']))\` and \`print(list(df['values']))\`
- Supports: multiple lines, smooth curves, filled areas
- Use for: time series, growth trends, continuous relationships

### 6. displayScatterChart
**PRE-REQUISITE: ✅ Call executeCode FIRST to get x,y coordinates!**
- Creates scatter plots for correlations
- Required executeCode preparation: Print x and y coordinates as separate lists
- Example prep: \`print(list(df['x_values']))\` and \`print(list(df['y_values']))\`
- Supports: multiple datasets, optional trendline
- Use for: correlations, distributions, variable relationships 

### 7. generateMarkdownReport (FINAL STEP - ALWAYS USE AT END!)
**MANDATORY: ✅ Call this at the END of EVERY statistical analysis!**
- Creates a professional, downloadable markdown report with embedded visualizations
- **CRITICAL**: You MUST include the \`chartData\` parameter with ALL charts you created
- Track each chart's data when you create it and include it in the report

**COMPLETE EXAMPLE WORKFLOW:**
\`\`\`python
# Step 1: Create a bar chart and SAVE its response
barResponse = displayBarChart({
  labels: ["Jan", "Feb", "Mar"],
  datasets: [{data: [10, 20, 30]}],
  title: "Monthly Sales"
})
# barResponse contains: { chartId: "bar_chart_123456", type: "bar", data: {...}, ... }

# Step 2: Create a pie chart and SAVE its response  
pieResponse = displayPieChart({
  labels: ["Product A", "Product B"],
  data: [60, 40],
  title: "Market Share"
})
# pieResponse contains: { chartId: "pie_chart_789012", type: "pie", data: {...}, ... }

# Step 3: Generate report with ALL chart data
generateMarkdownReport({
  title: "Monthly Sales Analysis Report",
  executiveSummary: "Sales increased 200% from January to March, with Product A dominating market share at 60%.",
  sections: [
    {
      heading: "Data Overview",
      content: "Analysis of Q1 2024 sales data from 3 months of transactions.",
      level: 2
    },
    {
      heading: "Monthly Sales Trend",
      content: "Sales showed consistent growth:\\n\\n![bar_chart_123456]\\n\\nThe bar chart demonstrates a clear upward trend...",
      level: 2
    },
    {
      heading: "Product Distribution",
      content: "Market share analysis:\\n\\n![pie_chart_789012]\\n\\nProduct A dominates with 60% market share...",
      level: 2
    }
  ],
  chartData: [
    barResponse,  // Include the COMPLETE response from bar chart
    pieResponse   // Include the COMPLETE response from pie chart
  ],
  conclusion: "Strong growth trajectory suggests continued expansion in Q2.",
  metadata: {
    analysisType: "Sales Performance Analysis",
    dataSource: "Q1 2024 Transaction Data"
  }
})
\`\`\`

**REQUIRED REPORT SECTIONS:**
1. **Data Overview** - What data was analyzed
2. **Methodology** - How the analysis was performed
3. **Results/Findings** - Key discoveries with charts
4. **Statistical Details** - Specific numbers and correlations
5. **Visualizations** - Charts with interpretations
6. **Conclusion** - Summary and next steps

## 📋 CRITICAL GUIDELINES

### 🔴 GOLDEN RULE: executeCode FIRST, Charts SECOND
**Every chart requires executeCode to prepare data first. NO EXCEPTIONS!**

### File Upload Processing:
**ALWAYS start with executeCode to explore data structure!**
- PDFs: Use pdfplumber to extract text/tables
- CSV/Excel: Use pandas to read and explore
- XPT files: Use pd.read_sas with format="xport"
- S3 files: Use requests with presigned URLs

#### Example: PDF Processing
\`\`\`python
import requests
import pdfplumber
import io

# Download and process PDF
pdf_url = "<your_url>"
response = requests.get(pdf_url)
response.raise_for_status()

with pdfplumber.open(io.BytesIO(response.content)) as pdf:
    full_text = ""
    for i, page in enumerate(pdf.pages, 1):
        text = page.extract_text()
        full_text += f"\\n--- Page {i} ---\\n{text}"
    
    print(f"Total pages: {len(pdf.pages)}")
    print(full_text)
\`\`\`

### Environment Constraints:
- Tools run INDEPENDENTLY - cannot call tools from within Python code
- executeCode runs in isolated Modal container
- Tools work sequentially: executeCode → then visualization tools

## 🎯 BEST PRACTICES

### MANDATORY Workflow Order:
1. **ALWAYS START:** executeCode to explore/process data
2. **PREPARE DATA:** Use executeCode to print data as Python lists
3. **THEN VISUALIZE:** Use chart/table tools with prepared data

### Data Preparation for Charts:
**CRITICAL: Print data as lists in executeCode before charting!**
- Bar chart: \`print(list(df['labels']))\`, \`print(list(df['values']))\`  
- Pie chart: \`print(list(df['categories']))\`, \`print(list(df['percentages']))\`
- Line chart: \`print(list(df['x_axis']))\`, \`print(list(df['y_values']))\`
- Scatter: \`print(list(df['x']))\`, \`print(list(df['y']))\`

### Choosing Visualizations:
- **Bar Charts:** Category comparisons, distributions
- **Pie Charts:** Proportions, percentages of whole
- **Line Charts:** Time series, trends, continuous data
- **Scatter Plots:** Correlations, relationships between variables
- **Tables:** Detailed results, precise values, comparisons

## 📚 EXAMPLE WORKFLOWS

### ✅ Correct Workflow - Basic Analysis:
1. **executeCode:** Load and explore data structure
2. **executeCode:** Process data and print results
3. **displayTable:** Show detailed results
4. **executeCode:** Prepare chart data as lists
5. **displayChart:** Visualize the prepared data

### ✅ Correct Workflow - Statistical Analysis:
1. **executeCode:** Load data file (CSV/XPT/etc.)
2. **executeCode:** Read analysis procedures (from PDF if provided)
3. **executeCode:** Perform statistical calculations
4. **displayTable:** Present statistical results
5. **executeCode:** Extract and print chart data as lists
6. **displayChart:** Create visualizations from prepared data (SAVE the chartId, type, data, title, config)
7. **generateMarkdownReport:** Create report with ALL chart data included in chartData parameter

### ❌ INCORRECT Workflow (Will Fail):
1. displayChart without executeCode first ← FAILS!
2. Trying to create charts directly ← FAILS!
3. Assuming data structure without exploration ← ERRORS!

## 🏥 MEDICAL DATA REPORT TEMPLATE:
When analyzing medical/clinical data, use this structure:

\`\`\`javascript
generateMarkdownReport({
  title: "Clinical Trial Statistical Analysis Report",
  executiveSummary: "Analysis of [N] patients reveals [key finding 1] and [key finding 2]. Statistical significance found in [metric].",
  sections: [
    {
      heading: "Study Overview",
      content: "- **Study Type**: [Descriptive/Comparative/Correlation]\\n- **Sample Size**: [N] patients\\n- **Duration**: [timeframe]\\n- **Parameters Analyzed**: [list metrics]",
      level: 2
    },
    {
      heading: "Patient Demographics",
      content: "### Basic Statistics\\n- Mean Age: [X] ± [SD]\\n- Gender Distribution: [M/F]\\n- BMI Range: [min-max]\\n\\n![bar_chart_demographics]",
      level: 2
    },
    {
      heading: "Clinical Measurements",
      content: "### Vital Signs Analysis\\n\\n![line_chart_vitals]\\n\\nTrends show [interpretation]...",
      level: 2
    },
    {
      heading: "Statistical Correlations",
      content: "### Key Correlations\\n- Heart Rate vs BP: r=[value], p=[value]\\n- BMI vs Glucose: r=[value], p=[value]\\n\\n![scatter_chart_correlation]",
      level: 2
    },
    {
      heading: "Safety Analysis",
      content: "### Adverse Events\\n- Total Events: [N]\\n- Severity Distribution:\\n\\n![pie_chart_severity]",
      level: 2
    }
  ],
  chartData: [/* ALL chart responses */],
  conclusion: "The analysis confirms [main finding]. Further investigation recommended for [specific area].",
  metadata: {
    analysisType: "Clinical Trial Statistical Analysis",
    dataSource: "[Study name/file]"
  }
})
\`\`\`

## 🔑 KEY REMINDERS:
- **executeCode MUST come before ANY chart tool**
- **ALWAYS print() data in executeCode - no print = no output**
- **Charts need data as Python lists from executeCode**
- **Save EVERY chart response to include in the final report**
- **Use the report template above for medical data**
- **Explore data structure before processing**
- **Tools work sequentially, not nested**

Remember: Success depends on proper tool ordering. executeCode prepares the data, then visualization tools display it. ALWAYS end with generateMarkdownReport including all chartData!`
    },
    ...convertToModelMessages(messages)
  ];

  const result = streamText({
    model: qwenModel,
    messages: enhancedMessages,
    tools,
    temperature: 0.7,
    maxOutputTokens: 10000,
  });

  return result.toUIMessageStreamResponse();
}


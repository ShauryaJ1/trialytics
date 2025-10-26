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
      return {
        success: true,
        type: 'bar' as const,
        data: { labels, datasets },
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
      return {
        success: true,
        type: 'line' as const,
        data: { labels, datasets },
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
      return {
        success: true,
        type: 'scatter' as const,
        data: { datasets },
        title,
        description,
        config: { showTrendline },
        chartId,
      };
    },
  }),
  
  getClinicalStudyReportGuidance: tool({
    description: 'Get detailed guidance on writing a Clinical Study Report (CSR) according to ICH E3 guidelines. Call this tool when you need to understand CSR structure, required sections, or best practices for clinical trial reporting.',
    inputSchema: z.object({
      section: z.enum([
        'overview',
        'title_page',
        'synopsis',
        'ethics',
        'study_objectives',
        'methodology',
        'efficacy',
        'safety',
        'statistical_analysis',
        'patient_disposition',
        'adverse_events',
        'laboratory_evaluation',
        'discussion_conclusions',
        'all_sections'
      ]).optional().default('overview')
        .describe('Specific CSR section to get guidance on, or "all_sections" for complete overview'),
      includeTemplate: z.boolean().optional().default(false)
        .describe('Include a template structure for the requested section'),
    }),
    execute: async ({ section, includeTemplate }) => {
      const guidance: Record<string, any> = {
        overview: {
          title: 'Clinical Study Report Overview',
          description: 'A CSR is a comprehensive document presenting the complete story of a clinical trial',
          key_principles: [
            'Follow ICH E3 guidelines for structure and content',
            'Present data objectively without bias',
            'Include all relevant safety and efficacy data',
            'Ensure traceability from source data to conclusions',
            'Maintain consistency across all sections'
          ],
          required_sections: [
            '1. Title Page',
            '2. Synopsis (3-page summary)',
            '3. Table of Contents',
            '4. List of Abbreviations',
            '5. Ethics',
            '6. Investigators and Administrative Structure',
            '7. Introduction',
            '8. Study Objectives',
            '9. Investigational Plan',
            '10. Study Patients',
            '11. Efficacy Evaluation',
            '12. Safety Evaluation',
            '13. Discussion and Overall Conclusions',
            '14. Tables, Figures, and Graphs',
            '15. Reference List',
            '16. Appendices'
          ]
        },
        title_page: {
          title: 'Title Page Requirements',
          required_elements: [
            'Study title',
            'Name of test drug/investigational product',
            'Indication studied',
            'Study design description (1-2 sentences)',
            'Sponsor name',
            'Protocol identification',
            'Development phase',
            'Study initiation and completion dates',
            'Principal investigator details',
            'GCP compliance statement',
            'Report date'
          ],
          template: includeTemplate ? `# CLINICAL STUDY REPORT TITLE PAGE

**Study Title:** [Full descriptive title]
**Investigational Product:** [Drug name]
**Indication:** [Disease/condition studied]
**Study Design:** [Brief description]

**Protocol Number:** [XXX-YYYY]
**Development Phase:** [Phase I/II/III/IV]
**Study Period:** [Start date] to [End date]

**Sponsor:** [Company name]
**Principal Investigator:** [Name, MD/PhD]
**Institution:** [Hospital/Research center]

**GCP Compliance:** This study was conducted in accordance with Good Clinical Practice guidelines

**Report Date:** [Date]
**Version:** [1.0]` : null
        },
        synopsis: {
          title: 'Synopsis Guidelines',
          description: 'A concise 3-page summary of the entire study',
          key_requirements: [
            'Limited to 3 pages maximum',
            'Include numerical data, not just text or p-values',
            'Cover all critical aspects of the study',
            'Stand-alone document that tells the complete story'
          ],
          required_content: [
            'Study objectives',
            'Methodology summary',
            'Patient disposition',
            'Demographics',
            'Primary efficacy results with numbers',
            'Key safety findings',
            'Conclusions'
          ]
        },
        efficacy: {
          title: 'Efficacy Evaluation',
          key_components: [
            'Data sets analyzed (ITT, Per Protocol, etc.)',
            'Demographic and baseline characteristics',
            'Treatment compliance measurements',
            'Primary efficacy endpoints analysis',
            'Secondary efficacy endpoints',
            'Subgroup analyses',
            'Statistical methodology'
          ],
          best_practices: [
            'Present both point estimates and confidence intervals',
            'Include all pre-specified analyses',
            'Clearly identify post-hoc analyses',
            'Use appropriate statistical tests',
            'Handle missing data transparently'
          ]
        },
        safety: {
          title: 'Safety Evaluation',
          key_analyses: [
            'Extent of exposure (dose, duration, patient numbers)',
            'Adverse events summary and analysis',
            'Deaths and serious adverse events',
            'Laboratory evaluations',
            'Vital signs and physical findings',
            'Discontinuations due to AEs'
          ],
          presentation_requirements: [
            'Include all AEs, not just drug-related',
            'Present by system organ class',
            'Provide patient-level listings',
            'Include narratives for SAEs and deaths',
            'Show laboratory shift tables'
          ]
        },
        statistical_analysis: {
          title: 'Statistical Analysis Plan',
          essential_elements: [
            'Sample size determination',
            'Randomization methods',
            'Blinding procedures',
            'Primary and secondary endpoints',
            'Analysis populations',
            'Handling of missing data',
            'Interim analysis plans',
            'Multiplicity adjustments'
          ]
        }
      };

      // Return all sections if requested
      if (section === 'all_sections') {
        return {
          success: true,
          guidance: guidance,
          recommendation: 'Review each section systematically when preparing your CSR'
        };
      }

      // Return specific section
      const sectionGuidance = guidance[section];
      if (!sectionGuidance) {
        return {
          success: false,
          error: `Section ${section} not found`,
          availableSections: Object.keys(guidance)
        };
      }

      return {
        success: true,
        section,
        ...sectionGuidance,
        tips: [
          'Ensure consistency in terminology throughout the report',
          'Cross-reference related sections appropriately',
          'Include page numbers for all references',
          'Use standard medical terminology and abbreviations'
        ]
      };
    },
  }),

  generateMarkdownReport: tool({
    description: 'Generate a comprehensive markdown report summarizing all analysis, visualizations, and findings. For clinical trials, this creates a Clinical Study Report (CSR) following ICH E3 guidelines.',
    inputSchema: z.object({
      title: z.string().describe('Title of the report'),
      reportType: z.enum(['statistical', 'clinical_study_report', 'analysis_summary']).optional().default('statistical')
        .describe('Type of report to generate'),
      sections: z.array(z.object({
        heading: z.string().describe('Section heading'),
        content: z.string().describe('Section content in markdown format. Reference charts using ![chart_id] placeholders where chart_id matches the chartId from chart tools.'),
        level: z.number().min(1).max(3).optional().default(2)
          .describe('Heading level (1 for main heading, 2 for subheading, 3 for sub-subheading)'),
      })).describe('Report sections in order'),
      chartData: z.array(z.object({
        chartId: z.string().describe('Unique ID of the chart'),
        type: z.enum(['bar', 'pie', 'line', 'scatter']).describe('Type of chart'),
        data: z.any().describe('Chart data object'),
        title: z.string().optional().describe('Chart title'),
        config: z.any().optional().describe('Chart configuration'),
      })).optional().describe('Chart data to embed in the report'),
      executiveSummary: z.string().optional()
        .describe('Executive summary or key findings at the beginning of the report'),
      conclusion: z.string().optional()
        .describe('Conclusions and recommendations at the end of the report'),
      metadata: z.object({
        analysisType: z.string().optional().describe('Type of analysis performed'),
        dataSource: z.string().optional().describe('Source of the data analyzed'),
        protocolNumber: z.string().optional().describe('Clinical trial protocol number'),
        studyPhase: z.string().optional().describe('Clinical trial phase'),
        investigationalProduct: z.string().optional().describe('Name of drug/device studied'),
        indication: z.string().optional().describe('Medical indication studied'),
      }).optional().describe('Additional metadata for the report'),
    }),
    execute: async ({ title, reportType, sections, chartData, executiveSummary, conclusion, metadata }) => {
      // Build the markdown content
      let markdownContent = '';
      
      // Add CSR-specific header if clinical study report
      if (reportType === 'clinical_study_report') {
        markdownContent += '# CLINICAL STUDY REPORT\n\n';
        markdownContent += '---\n\n';
        
        // Add metadata section for CSR
        if (metadata) {
          markdownContent += '## Study Information\n\n';
          if (metadata.protocolNumber) markdownContent += `**Protocol Number:** ${metadata.protocolNumber}\n\n`;
          if (metadata.investigationalProduct) markdownContent += `**Investigational Product:** ${metadata.investigationalProduct}\n\n`;
          if (metadata.indication) markdownContent += `**Indication:** ${metadata.indication}\n\n`;
          if (metadata.studyPhase) markdownContent += `**Study Phase:** ${metadata.studyPhase}\n\n`;
          markdownContent += '---\n\n';
        }
      }
      
      // Add executive summary if provided
      if (executiveSummary) {
        const summaryTitle = reportType === 'clinical_study_report' ? '## Synopsis' : '## Executive Summary';
        markdownContent += summaryTitle + '\n\n';
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
        const conclusionTitle = reportType === 'clinical_study_report' ? '## Discussion and Overall Conclusions' : '## Conclusion';
        markdownContent += conclusionTitle + '\n\n';
        markdownContent += conclusion + '\n\n';
      }
      
      // Add metadata
      const reportMetadata = {
        generatedAt: new Date().toLocaleString(),
        reportType: reportType || 'statistical',
        ...metadata,
      };
      
      // Set appropriate description based on report type
      let reportDescription = 'Statistical Analysis Report';
      if (reportType === 'clinical_study_report') {
        reportDescription = 'Clinical Study Report (ICH E3 Compliant)';
      } else if (executiveSummary) {
        reportDescription = executiveSummary.substring(0, 150) + '...';
      }
      
      return {
        success: true,
        content: markdownContent,
        title,
        reportType,
        description: reportDescription,
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
      content: `You are an AI coding assistant specializing in medical data analysis and visualization, with expertise in creating Clinical Study Reports (CSR) following ICH E3 guidelines.

## 🏥 CLINICAL STUDY REPORT (CSR) CAPABILITIES
**IMPORTANT: When analyzing clinical trial data, you MUST create a compliant Clinical Study Report as the FINAL step.**

### When Processing Clinical Trial Data:
- SDTM (Study Data Tabulation Model) datasets
- ADaM (Analysis Data Model) datasets  
- SAP (Statistical Analysis Plan) documents
- Adverse events, efficacy endpoints, safety data

### YOU MUST:
1. Follow the SAP procedures if provided
2. Analyze both efficacy and safety endpoints
3. Create all required visualizations
4. Call getClinicalStudyReportGuidance before writing the report
5. Generate a CSR-compliant report using generateMarkdownReport with reportType='clinical_study_report'

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
- NEVER assume data structure - always verify
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

### 7. getClinicalStudyReportGuidance (FOR CLINICAL TRIAL DATA)
**Use this tool when preparing Clinical Study Reports (CSR) according to ICH E3 guidelines**
- Call this BEFORE writing the final report to understand CSR requirements
- Get guidance on specific sections: title page, synopsis, efficacy, safety, etc.
- Request templates for proper formatting
- Ensures regulatory compliance for clinical trial reporting

**When to use:**
- Processing clinical trial data (SDTM, ADaM, SAS datasets)
- Analyzing adverse events, efficacy endpoints, or safety data
- Creating reports for regulatory submission
- Following SAP (Statistical Analysis Plan) procedures

### 8. generateMarkdownReport (FINAL STEP - ALWAYS USE AT END!)
**MANDATORY: ✅ Call this at the END of EVERY statistical analysis!**
- Creates a professional, downloadable markdown report with embedded visualizations
- For clinical trials: Generates CSR-compliant reports following ICH E3 structure
- **CRITICAL**: You MUST include the \`chartData\` parameter with ALL charts you created
- Track each chart's data when you create it and include it in the report
- The report will render the actual charts, not just placeholders
- Each chart tool returns a chartId and data - save these for the report

**How to use:**
1. When you create a chart, save its chartId, type, data, title, and config
2. When calling generateMarkdownReport, include ALL chart data in the chartData array
3. For clinical trials, set reportType to 'clinical_study_report'
4. In your markdown content, you can reference charts with ![chart_id] if needed

**Example chartData format:**
\`\`\`json
chartData: [
  {
    chartId: "bar_chart_123",
    type: "bar",
    data: { labels: [...], datasets: [...] },
    title: "Adverse Events by System Organ Class",
    config: { stacked: false, horizontal: true }
  },
  // ... more charts
]
\`\`\`

**For Statistical Analysis Reports, ALWAYS include:**
- Executive summary of key findings
- Methodology section explaining the analysis approach  
- Results section with charts and interpretations
- Conclusion with actionable insights
- ALL chart data in the chartData parameter

**For Clinical Study Reports (CSR), ALWAYS include:**
- Title page with protocol information
- Synopsis (3-page executive summary with numerical results)
- Patient disposition and demographics
- Efficacy evaluation with primary/secondary endpoints
- Safety evaluation with adverse events analysis
- Statistical methods and analysis populations
- Discussion and conclusions
- All supporting tables and figures

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

### ✅✅ CORRECT WORKFLOW - CLINICAL STUDY REPORT (CSR):
**FOLLOW THIS EXACT SEQUENCE FOR CLINICAL TRIAL DATA:**
1. **executeCode:** Load SDTM/ADaM datasets (XPT, SAS, CSV files)
2. **executeCode:** Read SAP (Statistical Analysis Plan) from PDF if provided
3. **executeCode:** Generate demographics and baseline characteristics tables
4. **displayTable:** Show patient disposition and demographics
5. **executeCode:** Analyze primary efficacy endpoints per SAP
6. **displayChart:** Visualize efficacy results (SAVE all chart data!)
7. **executeCode:** Analyze safety data (adverse events, labs, vital signs)
8. **displayTable:** Present adverse events by system organ class
9. **displayChart:** Create safety visualizations (SAVE all chart data!)
10. **getClinicalStudyReportGuidance:** Get CSR structure requirements
11. **generateMarkdownReport:** Create CSR with reportType='clinical_study_report'
    - Include ALL required ICH E3 sections
    - Include ALL chart data in chartData parameter
    - Follow regulatory formatting requirements

### ❌ INCORRECT Workflow (Will Fail):
1. displayChart without executeCode first ← FAILS!
2. Trying to create charts directly ← FAILS!
3. Assuming data structure without exploration ← ERRORS!
4. Skipping CSR guidance for clinical trials ← NON-COMPLIANT!

## 🔑 KEY REMINDERS:
- **executeCode MUST come before ANY chart tool**
- **ALWAYS print() data in executeCode - no print = no output**
- **Charts need data as Python lists from executeCode**
- **Explore data structure before processing**
- **Tools work sequentially, not nested**

Remember: Success depends on proper tool ordering. executeCode prepares the data, then visualization tools display it.`
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


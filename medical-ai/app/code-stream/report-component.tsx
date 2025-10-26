'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Download, FileText, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChartDisplay } from './chart-components';

interface MarkdownReportProps {
  content: string;
  title?: string;
  description?: string;
  images?: { [key: string]: string }; // Map of image IDs to base64 strings
  chartData?: Array<{
    chartId: string;
    type: 'bar' | 'pie' | 'line' | 'scatter';
    data: any;
    title?: string;
    config?: any;
  }>;
  metadata?: {
    generatedAt?: string;
    analysisType?: string;
    dataSource?: string;
  };
}

export function MarkdownReport({ 
  content, 
  title = "Analysis Report",
  description,
  images = {},
  chartData = [],
  metadata
}: MarkdownReportProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [chartBase64Map, setChartBase64Map] = useState<{ [key: string]: string }>({});
  const reportRef = useRef<HTMLDivElement>(null);

  // Process content to clean up any base64 URLs that might be in the markdown
  const processedContent = React.useMemo(() => {
    let processed = content;
    
    // Debug: Log if we find base64 URLs in the content
    if (processed.includes('data:image')) {
      console.log('Found base64 URLs in markdown content, cleaning up...');
    }
    
    // Remove any existing base64 data URLs from markdown image syntax
    // This prevents the long base64 strings from appearing as text
    // Pattern: ![chart_id](data:image/png;base64,...) -> ![chart_id]
    processed = processed.replace(/!\[([^\]]+)\]\(data:image\/[^)]+\)/g, (match, chartId) => {
      console.log(`Cleaning up base64 URL for chart: ${chartId}`);
      return `![${chartId}]`;
    });
    
    // Also handle cases where the parentheses might be on a new line or have spaces
    processed = processed.replace(/!\[([^\]]+)\]\s*\([^)]*data:image[^)]+\)/g, '![$1]');
    
    // Handle raw base64 strings that might have been inserted without proper markdown
    processed = processed.replace(/\(data:image\/[^)]+\)/g, '');
    
    return processed;
  }, [content, images, chartBase64Map]);

  const downloadReport = () => {
    // Generate final content with base64 images embedded
    let finalContent = processedContent; // Use processed content that has cleaned up base64 URLs
    
    // Replace chart placeholders with base64 images for download
    Object.entries(chartBase64Map).forEach(([id, base64]) => {
      const placeholder = new RegExp(`!\\[${id}\\]`, 'g');
      finalContent = finalContent.replace(placeholder, `![${id}](${base64})`);
    });
    
    // Also handle images prop
    Object.entries(images).forEach(([id, base64]) => {
      const placeholder = new RegExp(`!\\[${id}\\]`, 'g');
      finalContent = finalContent.replace(placeholder, `![${id}](${base64})`);
    });
    
    // Create HTML content for download
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: white;
    }
    h1 { 
      color: #1f2937; 
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    h2 { 
      color: #374151; 
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
      margin-top: 30px;
    }
    h3 { 
      color: #4b5563; 
      margin-top: 24px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: 600;
    }
    tr:hover {
      background-color: #f9fafb;
    }
    pre {
      background-color: #1e293b;
      color: #e2e8f0;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
    }
    code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #3b82f6;
      padding-left: 20px;
      margin-left: 0;
      color: #6b7280;
      font-style: italic;
    }
    img {
      max-width: 100%;
      height: auto;
      margin: 20px 0;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .metadata {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 30px;
      font-size: 0.9em;
    }
    .metadata h4 {
      margin: 0 0 10px 0;
      color: #6b7280;
      font-size: 0.85em;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .metadata p {
      margin: 4px 0;
    }
    ul, ol {
      margin: 16px 0;
      padding-left: 30px;
    }
    li {
      margin: 8px 0;
    }
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 30px 0;
    }
    .highlight {
      background-color: #fef3c7;
      padding: 2px 4px;
      border-radius: 2px;
    }
    .success {
      color: #10b981;
      font-weight: 600;
    }
    .warning {
      color: #f59e0b;
      font-weight: 600;
    }
    .error {
      color: #ef4444;
      font-weight: 600;
    }
    @media print {
      body {
        padding: 20px;
      }
      .metadata {
        page-break-after: avoid;
      }
      pre {
        page-break-inside: avoid;
      }
      img {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${description ? `<p style="font-size: 1.1em; color: #6b7280; margin-bottom: 30px;">${description}</p>` : ''}
  ${metadata ? `
  <div class="metadata">
    <h4>Report Metadata</h4>
    ${metadata.generatedAt ? `<p><strong>Generated:</strong> ${metadata.generatedAt}</p>` : ''}
    ${metadata.analysisType ? `<p><strong>Analysis Type:</strong> ${metadata.analysisType}</p>` : ''}
    ${metadata.dataSource ? `<p><strong>Data Source:</strong> ${metadata.dataSource}</p>` : ''}
  </div>
  ` : ''}
  <div id="content">
    ${convertMarkdownToHtml(finalContent)}
  </div>
</body>
</html>`;

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyMarkdown = () => {
    navigator.clipboard.writeText(processedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple markdown to HTML conversion for download
  const convertMarkdownToHtml = (markdown: string) => {
    let html = markdown;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Images (including base64)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Code blocks
    html = html.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // Lists
    html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
    // Replace single-line regex with multi-line compatible version
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    
    // Tables (basic support)
    html = html.replace(/\|(.+)\|/g, function(match, content) {
      const cells = content.split('|').map((cell: string) => cell.trim());
      const isHeader = cells.every((cell: string) => cell.match(/^[-:]+$/));
      if (isHeader) return '';
      const tag = cells.some((cell: string) => cell.includes('**')) ? 'th' : 'td';
      return '<tr>' + cells.map((cell: string) => `<${tag}>${cell}</${tag}>`).join('') + '</tr>';
    });
    html = html.replace(/(<tr>.*<\/tr>)/g, '<table>$1</table>');
    
    return html;
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <div>
              <h3 className="font-bold text-lg">{title}</h3>
              {description && (
                <p className="text-blue-100 text-sm mt-0.5">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyMarkdown}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors group relative"
              title="Copy Markdown"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-300" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied && (
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded">
                  Copied!
                </span>
              )}
            </button>
            <button
              onClick={downloadReport}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors relative group"
              title="Download Report (wait for charts to render)"
            >
              <Download className="h-4 w-4" />
              {chartData.length > Object.keys(chartBase64Map).length && (
                <span className="absolute -bottom-8 right-0 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Charts loading...
                </span>
              )}
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        
        {/* Metadata */}
        {metadata && (
          <div className="mt-3 pt-3 border-t border-white/20 flex flex-wrap gap-4 text-sm text-blue-100">
            {metadata.generatedAt && (
              <span>Generated: {metadata.generatedAt}</span>
            )}
            {metadata.analysisType && (
              <span>Type: {metadata.analysisType}</span>
            )}
            {metadata.dataSource && (
              <span>Source: {metadata.dataSource}</span>
            )}
          </div>
        )}
      </div>
      
      {/* Content */}
      {isExpanded && (
        <div 
          ref={reportRef}
          className="p-6 bg-white max-h-[600px] overflow-y-auto"
        >
          {/* Render embedded charts */}
          {chartData && chartData.length > 0 && (
            <div className="mb-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Visualizations</h2>
              {chartData.map((chart) => (
                <div key={chart.chartId} className="mb-6">
                  <ChartDisplay
                    type={chart.type}
                    data={chart.data}
                    title={chart.title}
                    config={chart.config}
                    onBase64Generated={(base64) => {
                      setChartBase64Map(prev => ({ ...prev, [chart.chartId]: base64 }));
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom rendering for code blocks
                code({ node, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !className || !match;
                  return !isInline && match ? (
                    <div className="relative group my-4">
                      <div className="absolute top-2 right-2 text-xs text-gray-400 uppercase tracking-wider">
                        {match[1]}
                      </div>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto shadow-md">
                        <code className="text-sm font-mono" {...props}>
                          {String(children).replace(/\n$/, '')}
                        </code>
                      </pre>
                    </div>
                  ) : (
                    <code 
                      className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-800 font-mono" 
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                // Custom table rendering
                table({ children }) {
                  return (
                    <div className="overflow-x-auto shadow-md rounded-lg my-4">
                      <table className="min-w-full border-collapse">
                        {children}
                      </table>
                    </div>
                  );
                },
                thead({ children }) {
                  return (
                    <thead className="bg-gray-100 border-b-2 border-gray-300">
                      {children}
                    </thead>
                  );
                },
                th({ children }) {
                  return (
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r border-gray-300 last:border-r-0">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="px-4 py-3 border-r border-gray-200 last:border-r-0">
                      {children}
                    </td>
                  );
                },
                tr({ children }) {
                  return (
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      {children}
                    </tr>
                  );
                },
                // Custom image rendering for base64 images
                img({ src, alt }) {
                  // Check if this is a chart placeholder (either without src or with a data URL we want to replace)
                  const srcStr = typeof src === 'string' ? src : '';
                  if (alt && (alt.includes('chart_') || !src || srcStr.startsWith('data:'))) {
                    // Look for the base64 image in our maps using the alt text as the key
                    const chartId = alt.replace(/^.*?((?:bar|pie|line|scatter)_chart_\d+).*$/, '$1');
                    const base64 = chartBase64Map[chartId] || images[chartId] || chartBase64Map[alt] || images[alt];
                    
                    if (base64) {
                      return (
                        <img 
                          src={base64} 
                          alt={alt || 'Chart visualization'}
                          className="rounded-lg shadow-md my-4 max-w-full h-auto"
                        />
                      );
                    }
                    // If no base64 available yet, show a placeholder
                    return (
                      <div className="bg-gray-100 rounded-lg p-8 my-4 text-center text-gray-500">
                        <div className="text-sm">Chart loading: {alt || chartId}</div>
                      </div>
                    );
                  }
                  
                  // Normal image with a proper src URL
                  if (src && !srcStr.startsWith('data:')) {
                    return (
                      <img 
                        src={src} 
                        alt={alt || 'Report image'}
                        className="rounded-lg shadow-md my-4 max-w-full h-auto"
                      />
                    );
                  }
                  
                  // Don't render anything for malformed images
                  return null;
                },
                // Custom styling for headings
                h1({ children }) {
                  return (
                    <h1 className="text-3xl font-bold text-gray-900 border-b-2 border-blue-500 pb-2 mb-4">
                      {children}
                    </h1>
                  );
                },
                h2({ children }) {
                  return (
                    <h2 className="text-2xl font-semibold text-gray-800 border-b border-gray-300 pb-2 mb-3 mt-6">
                      {children}
                    </h2>
                  );
                },
                h3({ children }) {
                  return (
                    <h3 className="text-xl font-semibold text-gray-700 mb-2 mt-4">
                      {children}
                    </h3>
                  );
                },
                // Custom blockquote
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-600 bg-blue-50 py-2 pr-4 rounded-r">
                      {children}
                    </blockquote>
                  );
                },
                // Custom list styling
                ul({ children }) {
                  return (
                    <ul className="list-disc list-inside space-y-2 my-3 ml-4">
                      {children}
                    </ul>
                  );
                },
                ol({ children }) {
                  return (
                    <ol className="list-decimal list-inside space-y-2 my-3 ml-4">
                      {children}
                    </ol>
                  );
                },
                li({ children }) {
                  return (
                    <li className="text-gray-700">
                      {children}
                    </li>
                  );
                },
                // Custom paragraph
                p({ children }) {
                  return (
                    <p className="text-gray-700 leading-relaxed my-3">
                      {children}
                    </p>
                  );
                },
                // Custom HR
                hr() {
                  return (
                    <hr className="my-6 border-t-2 border-gray-200" />
                  );
                },
              }}
            >
              {processedContent}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

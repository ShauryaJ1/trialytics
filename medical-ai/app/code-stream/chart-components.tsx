'use client';

import React, { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler,
  ChartConfiguration,
  ChartOptions,
  ScatterController,
  BubbleController,
  ChartData,
} from 'chart.js';
import { Bar, Pie, Line, Scatter } from 'react-chartjs-2';
import { Download, Maximize2, Minimize2 } from 'lucide-react';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController,
  BubbleController
);

// Common chart options
const defaultOptions: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        padding: 15,
        font: {
          size: 12,
        },
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      titleFont: {
        size: 14,
      },
      bodyFont: {
        size: 12,
      },
    },
  },
};

// Chart container wrapper for consistent styling and controls
interface ChartContainerProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  chartRef?: React.RefObject<ChartJS>;
  onBase64Generated?: (base64: string) => void;
}

function ChartContainer({ children, title, description, chartRef, onBase64Generated }: ChartContainerProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  
  // Generate base64 when chart is ready
  useEffect(() => {
    if (chartRef?.current && onBase64Generated) {
      // Wait a bit for chart to render
      setTimeout(() => {
        const base64 = chartRef.current?.toBase64Image();
        if (base64) {
          onBase64Generated(base64);
        }
      }, 500);
    }
  }, [chartRef, onBase64Generated]);
  
  const downloadChart = () => {
    if (chartRef?.current) {
      const url = chartRef.current.toBase64Image();
      const link = document.createElement('a');
      link.download = `chart-${Date.now()}.png`;
      link.href = url;
      link.click();
    }
  };

  return (
    <div className={`bg-white rounded-lg border-2 border-blue-200 p-4 ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          {title && (
            <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadChart}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Download chart"
          >
            <Download className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4 text-gray-600" />
            ) : (
              <Maximize2 className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>
      <div className={`${isFullscreen ? 'h-[calc(100%-80px)]' : 'h-[400px]'}`}>
        {children}
      </div>
    </div>
  );
}

// Bar Chart Component
interface BarChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
    }>;
  };
  options?: ChartOptions<'bar'>;
  title?: string;
  description?: string;
  stacked?: boolean;
  horizontal?: boolean;
  onBase64Generated?: (base64: string) => void;
}

export function BarChart({ 
  data, 
  options = {}, 
  title, 
  description,
  stacked = false,
  horizontal = false,
  onBase64Generated
}: BarChartProps) {
  const chartRef = useRef<ChartJS<'bar'>>(null);

  const enhancedOptions: ChartOptions<'bar'> = {
    ...defaultOptions,
    ...options,
    indexAxis: horizontal ? 'y' : 'x',
    scales: {
      x: {
        stacked,
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        stacked,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  // Apply default colors if not provided
  const enhancedData = {
    ...data,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || [
        'rgba(59, 130, 246, 0.8)',  // blue
        'rgba(16, 185, 129, 0.8)',  // green
        'rgba(251, 146, 60, 0.8)',   // orange
        'rgba(147, 51, 234, 0.8)',   // purple
        'rgba(236, 72, 153, 0.8)',   // pink
        'rgba(250, 204, 21, 0.8)',   // yellow
      ][index % 6],
      borderColor: dataset.borderColor || [
        'rgba(59, 130, 246, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(251, 146, 60, 1)',
        'rgba(147, 51, 234, 1)',
        'rgba(236, 72, 153, 1)',
        'rgba(250, 204, 21, 1)',
      ][index % 6],
      borderWidth: dataset.borderWidth ?? 1,
    })),
  };

  return (
    <ChartContainer title={title} description={description} chartRef={chartRef} onBase64Generated={onBase64Generated}>
      <Bar ref={chartRef} data={enhancedData} options={enhancedOptions} />
    </ChartContainer>
  );
}

// Pie Chart Component
interface PieChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      label?: string;
      data: number[];
      backgroundColor?: string[];
      borderColor?: string[];
      borderWidth?: number;
    }>;
  };
  options?: ChartOptions<'pie'>;
  title?: string;
  description?: string;
  isDoughnut?: boolean;
  onBase64Generated?: (base64: string) => void;
}

export function PieChart({ 
  data, 
  options = {}, 
  title, 
  description,
  isDoughnut = false,
  onBase64Generated
}: PieChartProps) {
  const chartRef = useRef<ChartJS<'pie'>>(null);

  const enhancedOptions: ChartOptions<'pie'> = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins,
      legend: {
        position: 'right' as const,
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
          generateLabels: (chart) => {
            const original = ChartJS.defaults.plugins.legend.labels.generateLabels;
            const labels = original(chart);
            
            labels.forEach((label) => {
              const dataset = chart.data.datasets[0];
              const value = dataset.data[label.index as number] as number;
              const total = (dataset.data as number[]).reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              label.text = `${label.text}: ${percentage}%`;
            });
            
            return labels;
          },
        },
      },
    },
    cutout: isDoughnut ? '50%' : undefined,
  };

  // Apply default colors if not provided
  const enhancedData = {
    ...data,
    datasets: data.datasets.map(dataset => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(147, 51, 234, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(250, 204, 21, 0.8)',
        'rgba(99, 102, 241, 0.8)',
        'rgba(245, 158, 11, 0.8)',
      ],
      borderColor: dataset.borderColor || '#ffffff',
      borderWidth: dataset.borderWidth ?? 2,
    })),
  };

  return (
    <ChartContainer title={title} description={description} chartRef={chartRef} onBase64Generated={onBase64Generated}>
      <Pie ref={chartRef} data={enhancedData} options={enhancedOptions} />
    </ChartContainer>
  );
}

// Line Chart Component
interface LineChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string;
      fill?: boolean;
      tension?: number;
      pointRadius?: number;
      pointHoverRadius?: number;
    }>;
  };
  options?: ChartOptions<'line'>;
  title?: string;
  description?: string;
  smooth?: boolean;
  area?: boolean;
  onBase64Generated?: (base64: string) => void;
}

export function LineChart({ 
  data, 
  options = {}, 
  title, 
  description,
  smooth = true,
  area = false,
  onBase64Generated
}: LineChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  const enhancedOptions: ChartOptions<'line'> = {
    ...defaultOptions,
    ...options,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  // Apply default colors and styling
  const enhancedData = {
    ...data,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      borderColor: dataset.borderColor || [
        'rgba(59, 130, 246, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(251, 146, 60, 1)',
        'rgba(147, 51, 234, 1)',
        'rgba(236, 72, 153, 1)',
        'rgba(250, 204, 21, 1)',
      ][index % 6],
      backgroundColor: area 
        ? (dataset.backgroundColor || [
            'rgba(59, 130, 246, 0.1)',
            'rgba(16, 185, 129, 0.1)',
            'rgba(251, 146, 60, 0.1)',
            'rgba(147, 51, 234, 0.1)',
            'rgba(236, 72, 153, 0.1)',
            'rgba(250, 204, 21, 0.1)',
          ][index % 6])
        : 'transparent',
      fill: area,
      tension: smooth ? (dataset.tension ?? 0.4) : 0,
      pointRadius: dataset.pointRadius ?? 3,
      pointHoverRadius: dataset.pointHoverRadius ?? 5,
      borderWidth: 2,
    })),
  };

  return (
    <ChartContainer title={title} description={description} chartRef={chartRef} onBase64Generated={onBase64Generated}>
      <Line ref={chartRef} data={enhancedData} options={enhancedOptions} />
    </ChartContainer>
  );
}

// Scatter Chart Component
interface ScatterChartProps {
  data: {
    datasets: Array<{
      label: string;
      data: Array<{ x: number; y: number }>;
      backgroundColor?: string;
      borderColor?: string;
      pointRadius?: number;
      pointHoverRadius?: number;
    }>;
  };
  options?: ChartOptions<'scatter'>;
  title?: string;
  description?: string;
  showTrendline?: boolean;
  onBase64Generated?: (base64: string) => void;
}

export function ScatterChart({ 
  data, 
  options = {}, 
  title, 
  description,
  showTrendline = false,
  onBase64Generated
}: ScatterChartProps) {
  const chartRef = useRef<ChartJS<'scatter'>>(null);

  const enhancedOptions: ChartOptions<'scatter'> = {
    ...defaultOptions,
    ...options,
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  // Calculate trendline if needed
  const calculateTrendline = (points: Array<{ x: number; y: number }>) => {
    if (!showTrendline || points.length < 2) return null;
    
    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    points.forEach(point => {
      sumX += point.x;
      sumY += point.y;
      sumXY += point.x * point.y;
      sumX2 += point.x * point.x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    
    return {
      label: 'Trendline',
      data: [
        { x: minX, y: slope * minX + intercept },
        { x: maxX, y: slope * maxX + intercept },
      ],
      type: 'line' as const,
      borderColor: 'rgba(156, 163, 175, 0.8)',
      backgroundColor: 'transparent',
      borderDash: [5, 5],
      pointRadius: 0,
      pointHoverRadius: 0,
    };
  };

  // Apply default colors and add trendline
  const enhancedData: ChartData<'scatter'> = {
    ...data,
    datasets: [
      ...data.datasets.map((dataset, index) => ({
        ...dataset,
        backgroundColor: dataset.backgroundColor || [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(250, 204, 21, 0.8)',
        ][index % 6],
        borderColor: dataset.borderColor || [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(251, 146, 60, 1)',
          'rgba(147, 51, 234, 1)',
          'rgba(236, 72, 153, 1)',
          'rgba(250, 204, 21, 1)',
        ][index % 6],
        pointRadius: dataset.pointRadius ?? 5,
        pointHoverRadius: dataset.pointHoverRadius ?? 7,
      })),
      ...(showTrendline && data.datasets.length > 0 && data.datasets[0].data.length > 1 
        ? [calculateTrendline(data.datasets[0].data)].filter(Boolean) as any
        : []),
    ],
  };

  return (
    <ChartContainer title={title} description={description} chartRef={chartRef} onBase64Generated={onBase64Generated}>
      <Scatter ref={chartRef} data={enhancedData} options={enhancedOptions} />
    </ChartContainer>
  );
}

// Combined Chart Display Component for easy integration
interface ChartDisplayProps {
  type: 'bar' | 'pie' | 'line' | 'scatter';
  data: any;
  options?: any;
  title?: string;
  description?: string;
  config?: {
    stacked?: boolean;
    horizontal?: boolean;
    isDoughnut?: boolean;
    smooth?: boolean;
    area?: boolean;
    showTrendline?: boolean;
  };
  onBase64Generated?: (base64: string) => void;
}

export function ChartDisplay({ 
  type, 
  data, 
  options = {}, 
  title, 
  description,
  config = {},
  onBase64Generated
}: ChartDisplayProps) {
  switch (type) {
    case 'bar':
      return (
        <BarChart 
          data={data} 
          options={options} 
          title={title} 
          description={description}
          stacked={config.stacked}
          horizontal={config.horizontal}
          onBase64Generated={onBase64Generated}
        />
      );
    case 'pie':
      return (
        <PieChart 
          data={data} 
          options={options} 
          title={title} 
          description={description}
          isDoughnut={config.isDoughnut}
          onBase64Generated={onBase64Generated}
        />
      );
    case 'line':
      return (
        <LineChart 
          data={data} 
          options={options} 
          title={title} 
          description={description}
          smooth={config.smooth}
          area={config.area}
          onBase64Generated={onBase64Generated}
        />
      );
    case 'scatter':
      return (
        <ScatterChart 
          data={data} 
          options={options} 
          title={title} 
          description={description}
          showTrendline={config.showTrendline}
          onBase64Generated={onBase64Generated}
        />
      );
    default:
      return (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Chart Error</div>
          <div className="text-sm text-red-600 mt-1">Invalid chart type: {type}</div>
        </div>
      );
  }
}

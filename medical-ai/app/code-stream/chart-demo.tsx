'use client';

import React from 'react';
import { BarChart, PieChart, LineChart, ScatterChart } from './chart-components';

/**
 * Demo page showcasing all chart types with sample medical/clinical data
 * This demonstrates how the chart components can be used in the medical-ai application
 */
export default function ChartDemo() {
  // Sample medical data for demonstrations
  
  // Bar Chart Data - Patient visits by department
  const barChartData = {
    labels: ['Emergency', 'Cardiology', 'Neurology', 'Pediatrics', 'Oncology', 'Orthopedics'],
    datasets: [
      {
        label: 'Q1 2024',
        data: [450, 320, 280, 410, 260, 380],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
      },
      {
        label: 'Q2 2024',
        data: [480, 340, 290, 430, 280, 400],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
      },
    ],
  };

  // Pie Chart Data - Disease distribution
  const pieChartData = {
    labels: ['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Cancer', 'Other'],
    datasets: [
      {
        data: [25, 30, 15, 20, 5, 5],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(250, 204, 21, 0.8)',
        ],
      },
    ],
  };

  // Line Chart Data - Patient recovery rates over time
  const lineChartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
    datasets: [
      {
        label: 'Treatment A',
        data: [20, 35, 45, 58, 68, 75, 82, 88],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Treatment B',
        data: [15, 28, 38, 48, 58, 65, 72, 78],
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Control Group',
        data: [10, 18, 25, 32, 38, 42, 48, 52],
        borderColor: 'rgba(251, 146, 60, 1)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Scatter Chart Data - Age vs Blood Pressure correlation
  const scatterChartData = {
    datasets: [
      {
        label: 'Male Patients',
        data: [
          { x: 25, y: 118 }, { x: 30, y: 122 }, { x: 35, y: 125 },
          { x: 40, y: 128 }, { x: 45, y: 132 }, { x: 50, y: 135 },
          { x: 55, y: 138 }, { x: 60, y: 142 }, { x: 65, y: 145 },
          { x: 70, y: 148 }, { x: 28, y: 120 }, { x: 33, y: 124 },
          { x: 38, y: 127 }, { x: 43, y: 130 }, { x: 48, y: 134 },
          { x: 53, y: 137 }, { x: 58, y: 140 }, { x: 63, y: 144 },
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        pointRadius: 5,
      },
      {
        label: 'Female Patients',
        data: [
          { x: 25, y: 115 }, { x: 30, y: 118 }, { x: 35, y: 121 },
          { x: 40, y: 124 }, { x: 45, y: 127 }, { x: 50, y: 130 },
          { x: 55, y: 133 }, { x: 60, y: 136 }, { x: 65, y: 139 },
          { x: 70, y: 142 }, { x: 27, y: 116 }, { x: 32, y: 119 },
          { x: 37, y: 122 }, { x: 42, y: 125 }, { x: 47, y: 128 },
          { x: 52, y: 131 }, { x: 57, y: 134 }, { x: 62, y: 137 },
        ],
        backgroundColor: 'rgba(236, 72, 153, 0.8)',
        pointRadius: 5,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Medical Data Visualization Charts</h1>
        <p className="text-gray-600 mb-8">
          Interactive Chart.js components for visualizing medical and clinical data
        </p>

        <div className="space-y-8">
          {/* Bar Chart Examples */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Bar Charts</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <BarChart
                data={barChartData}
                title="Patient Visits by Department"
                description="Quarterly comparison of patient visits across different hospital departments"
              />
              
              <BarChart
                data={barChartData}
                title="Stacked Department Visits"
                description="Total visits per department with quarterly breakdown"
                stacked={true}
              />
            </div>

            <div className="mb-6">
              <BarChart
                data={{
                  labels: barChartData.datasets[0].data.map((_, i) => barChartData.labels[i]),
                  datasets: [{
                    label: 'Total Visits',
                    data: barChartData.datasets[0].data.map((val, i) => 
                      val + barChartData.datasets[1].data[i]
                    ),
                  }],
                }}
                title="Horizontal Bar Chart - Total Department Visits"
                description="Combined Q1 and Q2 patient visits displayed horizontally"
                horizontal={true}
              />
            </div>
          </section>

          {/* Pie Charts */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Pie & Doughnut Charts</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PieChart
                data={pieChartData}
                title="Disease Distribution"
                description="Percentage breakdown of patient diagnoses"
              />
              
              <PieChart
                data={pieChartData}
                title="Disease Distribution (Doughnut)"
                description="Same data visualized as a doughnut chart"
                isDoughnut={true}
              />
            </div>
          </section>

          {/* Line Charts */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Line Charts</h2>
            
            <div className="grid grid-cols-1 gap-6">
              <LineChart
                data={lineChartData}
                title="Patient Recovery Rates"
                description="Comparison of recovery rates between different treatment protocols"
                smooth={true}
              />
              
              <LineChart
                data={lineChartData}
                title="Recovery Rates with Area Fill"
                description="Same data with filled areas under the lines for better visual impact"
                smooth={true}
                area={true}
              />
            </div>
          </section>

          {/* Scatter Charts */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Scatter Plots</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ScatterChart
                data={scatterChartData}
                title="Age vs Blood Pressure"
                description="Correlation between patient age and systolic blood pressure"
              />
              
              <ScatterChart
                data={scatterChartData}
                title="Age vs Blood Pressure with Trendline"
                description="Same data with linear regression trendline"
                showTrendline={true}
              />
            </div>
          </section>

          {/* Usage Examples */}
          <section className="mt-12 bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">How to Use These Charts</h2>
            
            <div className="prose max-w-none text-gray-600">
              <h3 className="text-lg font-medium text-gray-700 mt-4">In the Chat Interface:</h3>
              <p className="mb-4">
                The AI assistant can generate these charts automatically when analyzing data. Try prompts like:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>"Create a bar chart showing monthly patient admissions"</li>
                <li>"Visualize disease distribution using a pie chart"</li>
                <li>"Plot recovery rates over time with a line chart"</li>
                <li>"Show correlation between age and blood pressure using a scatter plot"</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-700 mt-6">Chart Features:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Interactive:</strong> Hover over data points to see values</li>
                <li><strong>Downloadable:</strong> Click the download button to save as PNG</li>
                <li><strong>Fullscreen:</strong> Expand charts for better viewing</li>
                <li><strong>Responsive:</strong> Charts adapt to different screen sizes</li>
                <li><strong>Customizable:</strong> Colors, styles, and configurations can be adjusted</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-700 mt-6">Chart Types:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Bar Charts:</strong> Compare categories, show distributions, grouped or stacked data</li>
                <li><strong>Pie Charts:</strong> Show proportions, percentages, parts of a whole</li>
                <li><strong>Line Charts:</strong> Visualize trends over time, continuous data, multiple series</li>
                <li><strong>Scatter Plots:</strong> Display correlations, relationships between variables, with optional trendlines</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

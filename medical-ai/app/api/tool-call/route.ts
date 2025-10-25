import { generateText, tool } from 'ai';
import { qwenModel } from '@/lib/ai-provider';
import { z } from 'zod';

export const runtime = 'edge';
export const maxDuration = 30;

// Define some example tools
const weatherTool = tool({
  description: 'Get the current weather for a given location',
  inputSchema: z.object({
    location: z.string().describe('The city and country, e.g., "San Francisco, USA"'),
    unit: z.enum(['celsius', 'fahrenheit']).optional().describe('Temperature unit'),
  }),
  execute: async ({ location, unit = 'celsius' }) => {
    // Simulate weather API call
    console.log(`Getting weather for ${location} in ${unit}`);
    
    // Mock weather data
    const mockWeather = {
      location,
      temperature: unit === 'celsius' ? 22 : 72,
      unit,
      condition: 'partly cloudy',
      humidity: '65%',
      windSpeed: '10 km/h',
    };
    
    return mockWeather;
  },
});

const calculatorTool = tool({
  description: 'Perform basic mathematical calculations',
  inputSchema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('Mathematical operation'),
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
  execute: async ({ operation, a, b }) => {
    console.log(`Calculating ${operation} for ${a} and ${b}`);
    
    switch (operation) {
      case 'add':
        return { result: a + b, operation: `${a} + ${b}` };
      case 'subtract':
        return { result: a - b, operation: `${a} - ${b}` };
      case 'multiply':
        return { result: a * b, operation: `${a} × ${b}` };
      case 'divide':
        if (b === 0) {
          return { error: 'Cannot divide by zero' };
        }
        return { result: a / b, operation: `${a} ÷ ${b}` };
    }
  },
});

const searchTool = tool({
  description: 'Search for information on a given topic',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    limit: z.number().optional().default(5).describe('Number of results to return'),
  }),
  execute: async ({ query, limit }) => {
    console.log(`Searching for: "${query}" with limit ${limit}`);
    
    // Mock search results
    return {
      query,
      results: [
        { title: `Result 1 for ${query}`, snippet: 'This is a mock search result...' },
        { title: `Result 2 for ${query}`, snippet: 'Another mock result about the topic...' },
        { title: `Result 3 for ${query}`, snippet: 'More information about your search...' },
      ].slice(0, limit),
      totalResults: 42,
    };
  },
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    console.log('Processing prompt with tools:', prompt);

    // Generate text with tool calling capabilities
    const { text, toolCalls, toolResults, usage } = await generateText({
      model: qwenModel,
      prompt: prompt || 'What is the weather like in San Francisco and what is 25 multiplied by 4?',
      tools: {
        weather: weatherTool,
        calculator: calculatorTool,
        search: searchTool,
      },
      toolChoice: 'auto', // Let the model decide which tools to use
      temperature: 0.7,
      maxOutputTokens: 1000,
    });

    console.log('Generated text:', text);
    console.log('Tool calls:', toolCalls);
    console.log('Tool results:', toolResults);

    return Response.json({
      text,
      toolCalls,
      toolResults,
      usage,
    });
  } catch (error) {
    console.error('Tool call error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process tool call';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

import { openaiCompatible } from '@ai-sdk/openai-compatible';
import { streamText } from 'ai';
import { trpc } from '@/lib/trpc-provider';

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Initialize vLLM client (replace with your actual vLLM endpoint)
  const vllm = openaiCompatible({
    baseURL: process.env.VLLM_ENDPOINT || 'http://localhost:8000/v1',
    apiKey: 'dummy-key', // vLLM doesn't require auth by default
  });

  try {
    const result = await streamText({
      model: vllm('your-model-name'), // Replace with your actual model name
      messages,
      onFinish: async (result) => {
        // Extract thinking content and wrap in tRPC
        const thinkingMatch = result.text.match(/<thinking>(.*?)<\/thinking>/s);
        if (thinkingMatch) {
          // You can store thinking content or process it here
          console.log('Thinking content:', thinkingMatch[1]);
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('vLLM API error:', error);
    return new Response('Error connecting to vLLM', { status: 500 });
  }
}

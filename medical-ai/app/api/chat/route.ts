import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { qwenModel } from '@/lib/ai-provider';

// Allow streaming responses from this endpoint
export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    console.log('Received messages:', messages);
    
    // Stream the response using the AI SDK (don't await - returns immediately)
    const result = streamText({
      model: qwenModel,
      messages: convertToModelMessages(messages),
      temperature: 0.7,
      maxOutputTokens: 1000, // Use maxOutputTokens per the AI SDK docs
    });

    // Return as a UI message streaming response
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process chat request';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

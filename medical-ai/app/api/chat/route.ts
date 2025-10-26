import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { qwenModel } from '@/lib/ai-provider';
import { createSupabaseAdmin } from '@/lib/supabase-server';

// Allow streaming responses from this endpoint
export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    // Pull a stable session id from query (?sid=...) to dedupe per session
    const url = new URL(req.url);
    const sidParam = url.searchParams.get('sid');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i; // v4 UUID
    const sessionId = sidParam && uuidRegex.test(sidParam) ? sidParam : crypto.randomUUID();

    console.log('Received messages:', messages);
    
    // Stream the response using the AI SDK (don't await - returns immediately)
    const result = streamText({
      model: qwenModel,
      messages: convertToModelMessages(messages),
      temperature: 0.7,
      // After streaming finishes, persist full history for this session
      onFinish: async (info: any) => {
        try {
          const supabase = createSupabaseAdmin();

          // Build full transcript: incoming messages + assistant final text
          const assistantText: string | undefined = info?.text;
          const assistantMessage = assistantText
            ? {
                id: crypto.randomUUID(),
                role: 'assistant',
                parts: [{ type: 'text', text: assistantText }],
              }
            : null;

          const tokenCount =
            info?.usage?.totalTokens ??
            info?.response?.metadata?.vllm?.streamingUsage?.total_tokens ??
            null;

          // Derive a concise title from the first user message
          const titleSource = messages.find((m) => m.role === 'user');
          const title = titleSource
            ? String(
                (titleSource.parts || [])
                  .map((p: any) => (p?.type === 'text' ? p.text : ''))
                  .join(' ')
              ).slice(0, 120)
            : null;

          // Avoid relying on an ON CONFLICT unique constraint (may not exist).
          // Use select -> insert or update flow so we don't hit Postgres 42P10.
          try {
            const { data: existing, error: selectErr } = await supabase
              .from('chat_logs')
              .select('session_id, messages, title')
              .eq('session_id', sessionId)
              .maybeSingle();

            if (selectErr) {
              console.error('chat_logs select error:', selectErr);
            } else if (existing) {
              // Merge existing history with new messages by id to avoid duplicates
              const existingMsgs: any[] = Array.isArray((existing as any).messages)
                ? ((existing as any).messages as any[])
                : [];
              const existingIds = new Set(existingMsgs.map((m: any) => m?.id).filter(Boolean));

              const newUserMsgs = (messages || []).filter((m: any) => !existingIds.has(m?.id));
              const merged = [...existingMsgs, ...newUserMsgs];
              if (assistantMessage) merged.push(assistantMessage);

              const { error: updateErr } = await supabase
                .from('chat_logs')
                .update({
                  // keep existing title if already set, otherwise set derived title
                  title: (existing as any).title ?? title,
                  model: 'Qwen/Qwen3-8B',
                  messages: merged as any,
                  token_count: tokenCount,
                })
                .eq('session_id', sessionId);
              if (updateErr) console.error('chat_logs update error:', updateErr);
            } else {
              const baseMessages = [...messages];
              if (assistantMessage) baseMessages.push(assistantMessage);
              const { error: insertErr } = await supabase.from('chat_logs').insert({
                session_id: sessionId,
                title,
                model: 'Qwen/Qwen3-8B',
                messages: baseMessages as any,
                token_count: tokenCount,
              });
              if (insertErr) console.error('chat_logs insert error:', insertErr);
            }
          } catch (innerErr) {
            console.error('chat_logs persistence flow failed:', innerErr);
          }
        } catch (err) {
          console.error('chat_logs persistence failed:', err);
        }
      },
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

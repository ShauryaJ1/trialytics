import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// Custom metadata extractor for VLLM
const vllmMetadataExtractor = {
  extractMetadata: ({ parsedBody }: any) => {
    return {
      vllm: {
        usage: parsedBody.usage,
        modelVersion: parsedBody.model,
        // Add any VLLM-specific metadata here
        finishReason: parsedBody.choices?.[0]?.finish_reason,
      },
    };
  },
  createStreamExtractor: () => {
    let accumulatedUsage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };
    
    return {
      processChunk: (parsedChunk: any) => {
        // Accumulate usage data from streaming chunks if available
        if (parsedChunk.usage) {
          accumulatedUsage.prompt_tokens += parsedChunk.usage.prompt_tokens || 0;
          accumulatedUsage.completion_tokens += parsedChunk.usage.completion_tokens || 0;
          accumulatedUsage.total_tokens += parsedChunk.usage.total_tokens || 0;
        }
      },
      buildMetadata: () => ({
        vllm: {
          streamingUsage: accumulatedUsage,
        },
      }),
    };
  },
};

// Create custom VLLM provider instance
export const qwenProvider = createOpenAICompatible({
  name: 'qwen-vllm',
  baseURL: process.env.VLLM_BASE_URL || 'cooked',
  // No API key needed for this endpoint - VLLM doesn't require auth
  includeUsage: true, // Include usage information in streaming responses
  metadataExtractor: vllmMetadataExtractor, // Use custom metadata extractor for VLLM
});

// Export the model instance with max tokens configuration
export const qwenModel = qwenProvider('Qwen/Qwen3-8B');

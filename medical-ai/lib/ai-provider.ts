import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// Build-time environment variable debugging
const VLLM_BASE_URL = process.env.VLLM_BASE_URL;
const IS_BUILD_TIME = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development';

// Log environment variable status at module load time (build time)
console.log('=== VLLM Provider Configuration ===');
console.log(`Build Time: ${new Date().toISOString()}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`VLLM_BASE_URL defined: ${!!VLLM_BASE_URL}`);
console.log(`VLLM_BASE_URL value: ${VLLM_BASE_URL ? '[REDACTED]' : 'undefined'}`);
console.log(`Using fallback: ${!VLLM_BASE_URL}`);
console.log('===================================');

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

// Determine the base URL with detailed logging
const getBaseURL = () => {
  if (VLLM_BASE_URL) {
    console.log(`✅ Using VLLM_BASE_URL from environment: [URL REDACTED]`);
    return VLLM_BASE_URL;
  }
  
  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    const devUrl = 'http://localhost:8000';
    console.warn(`⚠️ VLLM_BASE_URL not found, using development fallback: ${devUrl}`);
    return devUrl;
  }
  
  // Production error
  const errorMsg = '❌ VLLM_BASE_URL is not defined in production!';
  console.error(errorMsg);
  console.error('Please set the VLLM_BASE_URL environment variable in your deployment platform.');
  
  // Still use a fallback to prevent build failures, but log the issue
  return 'https://api.placeholder.com';
};

// Create custom VLLM provider instance
const baseURL = getBaseURL();

// Validate URL format
try {
  new URL(baseURL);
  console.log('✅ Base URL is valid format');
} catch (error) {
  console.error(`❌ Invalid URL format: ${baseURL}`, error);
}

export const qwenProvider = createOpenAICompatible({
  name: 'qwen-vllm',
  baseURL,
  // No API key needed for this endpoint - VLLM doesn't require auth
  includeUsage: true, // Include usage information in streaming responses
});

// Export the model instance with max tokens configuration
export const qwenModel = qwenProvider('Qwen/Qwen3-8B');

// Log final configuration
console.log('=== VLLM Provider Created Successfully ===');
console.log(`Provider: qwen-vllm`);
console.log(`Model: Qwen/Qwen3-8B`);
console.log(`Base URL configured: ${!!baseURL}`);
console.log('==========================================');

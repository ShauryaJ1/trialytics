# Qwen AI Chat Application

A Next.js application using Vercel AI SDK with OpenAI-compatible provider to connect to a VLLM-powered Qwen3-8B model endpoint.

## Features

- 🚀 Real-time streaming responses
- 💬 Clean and modern chat interface
- 🔌 OpenAI-compatible provider integration
- 📊 Custom metadata extraction for VLLM
- 🎨 Beautiful UI with Tailwind CSS
- ⚡ Edge runtime for optimal performance
- 🔧 Structured object generation with schemas
- 🛠️ Tool calling capabilities for enhanced interactions

## Tech Stack

- **Next.js 15** - React framework with App Router
- **Vercel AI SDK** - Unified AI SDK for building AI-powered applications
- **@ai-sdk/openai-compatible** - OpenAI-compatible provider for custom endpoints
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **VLLM** - High-throughput LLM serving (backend)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Access to the VLLM endpoint at `http://98.88.218.185:8000`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration

The VLLM endpoint is configured in `lib/ai-provider.ts`:

```typescript
baseURL: 'http://98.88.218.185:8000/v1'
model: 'Qwen/Qwen3-8B'
```

No API key is required for this endpoint.

## Project Structure

```
medical-ai/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts          # Chat API endpoint with streaming
│   │   ├── generate-object/
│   │   │   └── route.ts          # Structured object generation API
│   │   └── tool-call/
│   │       └── route.ts          # Tool calling API with weather, calculator, search
│   ├── page.tsx                  # Main chat interface
│   ├── structured/
│   │   └── page.tsx              # Test page for advanced features
│   └── layout.tsx                # Root layout
├── lib/
│   └── ai-provider.ts            # VLLM provider configuration
└── package.json
```

## How It Works

1. **Provider Configuration**: The app uses `@ai-sdk/openai-compatible` to create a custom provider that connects to the VLLM endpoint
2. **Streaming Support**: Real-time streaming of AI responses using the Vercel AI SDK's `streamText` function
3. **Custom Metadata Extraction**: Extracts VLLM-specific metadata like usage statistics from the response
4. **Chat Interface**: Uses the `useChat` hook from `ai/react` for managing chat state and streaming

## API Endpoint

The chat API endpoint (`/api/chat`) accepts POST requests with messages and returns streaming responses.

### Example Request

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ]
}
```

## Advanced Features

### Structured Object Generation

Navigate to `/structured` to test structured object generation. The app can generate typed, structured data using Zod schemas:

```typescript
// Example: Generate a recipe object
const result = await generateObject({
  model: qwenModel,
  schema: recipeSchema,
  prompt: 'Generate a lasagna recipe',
});
```

### Tool Calling

The application supports tool calling, allowing the model to use functions like:
- **Weather Tool**: Get weather information for locations
- **Calculator Tool**: Perform mathematical calculations
- **Search Tool**: Simulate information searches

Test these features at `/structured` in the UI.

## Customization

### Changing Model Parameters

Edit the `app/api/chat/route.ts` file to adjust model parameters:

```typescript
const result = streamText({
  model: qwenModel,
  messages,
  temperature: 0.7,  // Adjust creativity (0-1)
  maxTokens: 1000,   // Maximum response length
});
```

### Custom Metadata Extraction

The `vllmMetadataExtractor` in `lib/ai-provider.ts` can be extended to capture additional VLLM-specific metadata:

```typescript
extractMetadata: ({ parsedBody }) => {
  // Add more fields as needed based on VLLM response
  return {
    vllm: {
      usage: parsedBody.usage,
      modelVersion: parsedBody.model,
      // Add custom fields here
    },
  };
}
```

## Troubleshooting

- **Connection Refused**: Ensure the VLLM endpoint at `http://98.88.218.185:8000` is accessible
- **CORS Issues**: If running into CORS problems, you may need to configure CORS on the VLLM server
- **Streaming Not Working**: Check that the Edge runtime is enabled in the API route

## License

MIT
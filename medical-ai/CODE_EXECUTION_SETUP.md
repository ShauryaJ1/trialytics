# Code Execution Integration Setup

This document describes how the medical-ai application integrates with the Modal server for Python code execution.

## Architecture Overview

```
┌─────────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│   Next.js Client    │  ──►    │  /api/execute-code   │  ──►    │   Modal Server  │
│  (Code Executor UI) │         │    (AI + Tools)      │         │ (3.212.17.117)  │
└─────────────────────┘         └──────────────────────┘         └─────────────────┘
```

## Components

### 1. Modal Server (Backend)
- **URL**: `http://3.212.17.117:8000`
- **Location**: `backend-services/modal_server/`
- **Purpose**: Executes Python code in sandboxed Modal containers
- **Key Endpoints**:
  - `/execute` - Execute Python code
  - `/health` - Check server status
  - `/test` - Test Modal setup

### 2. Next.js API Route
- **Path**: `medical-ai/app/api/execute-code/route.ts`
- **Purpose**: Provides AI agent with tools to execute code
- **Tools Available**:
  - `executeCode` - Runs Python code via Modal
  - `analyzeCode` - Static code analysis
  - `getExamples` - Code snippet examples

### 3. User Interfaces
#### Basic Code Executor
- **Path**: `medical-ai/app/code-executor/page.tsx`
- **URL**: `http://localhost:3000/code-executor`
- **Purpose**: Basic interactive UI for testing code execution

#### Streaming Chat with Visual Components
- **Path**: `medical-ai/app/code-stream/page.tsx`
- **URL**: `http://localhost:3000/code-stream`
- **Purpose**: Advanced streaming chat with visual tool rendering
- **Features**:
  - Real-time streaming responses
  - Collapsible reasoning/thinking blocks (`<think>` tags)
  - Visual code execution results
  - Message components following AI SDK Elements patterns

## Quick Start

### 1. Start the Next.js Application

```bash
cd medical-ai
npm install
npm run dev
```

### 2. Test the Integration

#### Option A: Use the Web UI
1. Open browser to `http://localhost:3000/code-executor`
2. Click "Refresh" to check Modal server status
3. Try example prompts or enter your own
4. Click "Execute with AI" to run

#### Option B: Use the Test Script
```bash
cd medical-ai
node test-execute-code-api.js
```

#### Option C: Direct API Call
```bash
# Check server health
curl http://localhost:3000/api/execute-code

# Execute code via AI
curl -X POST http://localhost:3000/api/execute-code \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write Python code to calculate the Fibonacci sequence for n=10"
  }'
```

## Example Use Cases

### 1. Data Analysis
```javascript
{
  "prompt": "Create a pandas DataFrame with sales data and calculate monthly totals"
}
```

### 2. Scientific Computing
```javascript
{
  "prompt": "Use NumPy to create a correlation matrix for random data"
}
```

### 3. Visualization
```javascript
{
  "prompt": "Generate a matplotlib plot showing a sine wave"
}
```

### 4. Web Scraping
```javascript
{
  "prompt": "Fetch data from a public API and parse the JSON response"
}
```

## How It Works

1. **User Request**: User provides a natural language prompt
2. **AI Processing**: The Qwen model interprets the prompt and decides which tools to use
3. **Code Generation**: AI generates Python code based on the request
4. **Tool Execution**: The `executeCode` tool sends the code to Modal server
5. **Sandboxed Execution**: Modal runs the code in an isolated container
6. **Result Return**: Output, errors, and execution time are returned to the user

## Security Features

- **Sandboxed Environment**: Code runs in isolated Modal containers
- **Timeout Protection**: Maximum execution time of 300 seconds
- **No Persistent State**: Each execution is independent
- **Network Isolation**: Limited network access in sandbox

## Available Python Packages

The Modal environment includes common data science packages:
- NumPy
- Pandas
- Matplotlib
- Seaborn
- SciPy
- Scikit-learn
- Requests
- BeautifulSoup4
- And many more...

## Troubleshooting

### Modal Server Offline
- Check if `http://3.212.17.117:8000/health` is accessible
- Verify the Modal server is running on the EC2 instance
- Check AWS security groups allow port 8000

### CORS Issues
- The Modal server is configured to allow all origins (`*`)
- If issues persist, check browser console for specific errors

### Timeout Errors
- Default timeout is 30 seconds, max is 300 seconds
- Large computations may need increased timeout:
  ```javascript
  {
    "prompt": "...",
    "timeout": 120  // 2 minutes
  }
  ```

### Code Execution Failures
- Check the error message in the response
- Common issues:
  - Missing imports
  - Syntax errors
  - Package not available
  - Resource limits exceeded

## Development Tips

### Adding New Tools
Edit `/api/execute-code/route.ts` to add new tools:
```typescript
const myNewTool = tool({
  description: 'Description of what this tool does',
  inputSchema: z.object({
    // Define input parameters
  }),
  execute: async (params) => {
    // Tool implementation
  }
});
```

### Customizing the UI
Edit `/app/code-executor/page.tsx` to modify the interface.

### Monitoring
Check server logs:
- Next.js: Console output in terminal
- Modal Server: SSH to EC2 and check Docker logs

## API Response Format

### Successful Execution
```json
{
  "text": "AI explanation of what was done",
  "toolCalls": [
    {
      "toolName": "executeCode",
      "args": { "code": "...", "timeout": 30 }
    }
  ],
  "toolResults": [
    {
      "toolName": "executeCode",
      "result": {
        "success": true,
        "output": "Result of code execution",
        "execution_time": 1.23
      }
    }
  ],
  "usage": {
    "promptTokens": 123,
    "completionTokens": 456,
    "totalTokens": 579
  }
}
```

### Failed Execution
```json
{
  "text": "AI explanation of the error",
  "toolResults": [
    {
      "result": {
        "success": false,
        "error": "Error message",
        "output": ""
      }
    }
  ]
}
```

## Next Steps

1. **Production Deployment**: 
   - Set up proper authentication for Modal server
   - Use environment variables for server URL
   - Implement rate limiting

2. **Enhanced Features**:
   - Add file upload/download capabilities
   - Implement code versioning
   - Add collaborative features
   - Support for other languages

3. **Monitoring**:
   - Add logging and analytics
   - Track usage metrics
   - Monitor execution times and errors

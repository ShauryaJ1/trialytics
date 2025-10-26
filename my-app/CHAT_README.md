# Medical AI Chat Application

This application provides a comprehensive chat interface for medical document analysis using vLLM backend integration.

## Features

### Document Upload
- **Clinical Trial Protocol**: PDF upload with drag & drop support
- **Raw Clean Data**: CSV/JSON file upload
- **Statistical Analysis Protocol (SAP)**: PDF upload
- Visual indicators for each document type with appropriate icons
- File validation and error handling

### AI Chat Interface
- Real-time chat with vLLM backend
- Document context integration
- Thinking process visualization with collapsible dropdowns
- Secure tRPC integration for all LLM calls

### Security
- All LLM interactions wrapped in tRPC procedures
- Type-safe API calls with Zod validation
- Secure document handling

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
# Create .env.local file
VLLM_ENDPOINT=http://localhost:8000/v1
VLLM_MODEL_NAME=your-model-name
```

3. Start the development server:
```bash
npm run dev
```

## Usage

1. Navigate to `/chat` in your browser
2. Upload your medical documents using drag & drop or file browser
3. Ask questions about your uploaded documents
4. View AI thinking process by clicking "Show Thinking" buttons

## Architecture

- **Frontend**: Next.js 15 with TypeScript
- **UI Components**: ShadCN/UI with Tailwind CSS
- **State Management**: React Query via tRPC
- **File Upload**: react-dropzone
- **Backend Integration**: tRPC with vLLM API
- **Type Safety**: Zod validation schemas

## API Endpoints

- `POST /api/trpc/chat` - Chat with AI assistant
- `POST /api/trpc/uploadDocument` - Upload document processing
- `POST /api/trpc/analyzeDocuments` - Document analysis

## Document Types

- **Protocol**: Clinical trial protocol documents (PDF)
- **Raw Data**: Cleaned clinical data (CSV/JSON)
- **SAP**: Statistical analysis protocol (PDF)

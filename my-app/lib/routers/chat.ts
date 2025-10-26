import { router, publicProcedure } from '@/lib/trpc';
import { z } from 'zod';
import { generateText } from 'ai';
import { qwenModel } from '@/lib/ai-provider';

export const appRouter = router({
  // Chat with vLLM backend
  chat: publicProcedure
    .input(z.object({
      message: z.string(),
      documents: z.object({
        protocol: z.string().optional(),
        rawData: z.string().optional(),
        sap: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Prepare context from uploaded documents
        let context = '';
        if (input.documents) {
          if (input.documents.protocol) {
            context += `Clinical Trial Protocol: ${input.documents.protocol.substring(0, 1000)}...\n\n`;
          }
          if (input.documents.rawData) {
            context += `Raw Data: ${input.documents.rawData.substring(0, 1000)}...\n\n`;
          }
          if (input.documents.sap) {
            context += `Statistical Analysis Protocol: ${input.documents.sap.substring(0, 1000)}...\n\n`;
          }
        }

        const prompt = `You are a medical AI assistant helping with clinical trial analysis. 
        
Context from uploaded documents:
${context}

User question: ${input.message}

Please provide a helpful response based on the uploaded documents. If you need to think through the problem, wrap your reasoning in <think> tags.`;

        const result = await generateText({
          model: qwenModel,
          prompt,
          maxTokens: 2000,
          temperature: 0.7,
        });

        // Extract reasoning content from <think> tags
        const reasoningMatch = result.text.match(/<think>([\s\S]*?)<\/redacted_reasoning>/);
        const reasoning = reasoningMatch ? reasoningMatch[1].trim() : null;
        
        // Clean the response by removing <think> tags
        const cleanResponse = result.text
          .replace(/<think>[\s\S]*?<\/redacted_reasoning>/g, '')
          .trim();

        return {
          response: cleanResponse,
          thinking: result.text.match(/<thinking>([\s\S]*?)<\/thinking>/)?.[1] || null,
          reasoning: reasoning,
        };
      } catch (error) {
        console.error('vLLM API error:', error);
        return {
          response: 'Sorry, I encountered an error processing your request. Please try again.',
          thinking: null,
        };
      }
    }),

  // Upload and process documents
  uploadDocument: publicProcedure
    .input(z.object({
      type: z.enum(['protocol', 'rawData', 'sap']),
      content: z.string(),
      filename: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Process document upload
      return {
        success: true,
        message: `${input.type} document uploaded successfully`,
        filename: input.filename,
      };
    }),

  // Analyze documents with AI
  analyzeDocuments: publicProcedure
    .input(z.object({
      documents: z.object({
        protocol: z.string().optional(),
        rawData: z.string().optional(),
        sap: z.string().optional(),
      }),
      analysisType: z.enum(['summary', 'compliance', 'statistical', 'custom']),
      customPrompt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        let prompt = '';
        
        switch (input.analysisType) {
          case 'summary':
            prompt = 'Provide a comprehensive summary of the uploaded documents.';
            break;
          case 'compliance':
            prompt = 'Analyze the documents for regulatory compliance issues.';
            break;
          case 'statistical':
            prompt = 'Review the statistical analysis protocol and data for potential issues.';
            break;
          case 'custom':
            prompt = input.customPrompt || 'Analyze the documents based on the provided prompt.';
            break;
        }

        const context = Object.entries(input.documents)
          .filter(([_, content]) => content)
          .map(([type, content]) => `${type}: ${content?.substring(0, 2000)}...`)
          .join('\n\n');

        const fullPrompt = `Context:\n${context}\n\nTask: ${prompt}\n\nPlease provide a detailed analysis. Wrap your reasoning in <think> tags.`;

        const result = await generateText({
          model: qwenModel,
          prompt: fullPrompt,
          maxTokens: 2000,
          temperature: 0.7,
        });

        // Extract reasoning content from <think> tags
        const reasoningMatch = result.text.match(/<think>([\s\S]*?)<\/redacted_reasoning>/);
        const reasoning = reasoningMatch ? reasoningMatch[1].trim() : null;
        
        // Clean the response by removing <think> tags
        const cleanAnalysis = result.text
          .replace(/<think>[\s\S]*?<\/redacted_reasoning>/g, '')
          .trim();

        return {
          analysis: cleanAnalysis,
          thinking: result.text.match(/<thinking>([\s\S]*?)<\/thinking>/)?.[1] || null,
          reasoning: reasoning,
        };
      } catch (error) {
        console.error('Analysis error:', error);
        return {
          analysis: 'Sorry, I encountered an error during analysis. Please try again.',
          thinking: null,
        };
      }
    }),
});

export type AppRouter = typeof appRouter;

import { generateText, generateObject } from 'ai';
import { qwenModel } from '@/lib/ai-provider';
import { z } from 'zod';

export const runtime = 'edge';
export const maxDuration = 30;

// Example: Generate a recipe object
export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    // Define the schema for the object we want to generate
    const recipeSchema = z.object({
      recipe: z.object({
        name: z.string().describe('Name of the recipe'),
        description: z.string().describe('Brief description of the dish'),
        servings: z.number().describe('Number of servings'),
        prepTime: z.string().describe('Preparation time (e.g., "15 minutes")'),
        cookTime: z.string().describe('Cooking time (e.g., "30 minutes")'),
        ingredients: z.array(z.object({
          item: z.string(),
          amount: z.string(),
        })).describe('List of ingredients with amounts'),
        instructions: z.array(z.string()).describe('Step-by-step cooking instructions'),
        difficulty: z.enum(['easy', 'medium', 'hard']).describe('Recipe difficulty level'),
      }),
    });

    console.log('Generating object for prompt:', prompt);

    // Try using generateObject first
    try {
      const { object, finishReason, usage } = await generateObject({
        model: qwenModel,
        schema: recipeSchema,
        prompt: prompt || 'Generate a detailed lasagna recipe for 6 people',
        temperature: 0.7,
        maxOutputTokens: 1000,
        mode: 'json', // Force JSON mode for VLLM
      });

      console.log('Generated object:', object);
      console.log('Usage:', usage);

      return Response.json({
        object,
        finishReason,
        usage,
      });
    } catch (generateObjectError) {
      console.log('generateObject failed, falling back to generateText + manual parsing:', generateObjectError);
      
      // Fallback: Use generateText and parse manually
      const schemaDescription = `Generate a JSON object with the following structure:
{
  "recipe": {
    "name": "string - Name of the recipe",
    "description": "string - Brief description of the dish",
    "servings": "number - Number of servings",
    "prepTime": "string - Preparation time (e.g., '15 minutes')",
    "cookTime": "string - Cooking time (e.g., '30 minutes')",
    "ingredients": [
      {
        "item": "string - Ingredient name",
        "amount": "string - Amount needed"
      }
    ],
    "instructions": ["string - Step-by-step instructions"],
    "difficulty": "easy | medium | hard"
  }
}`;

      const { text, finishReason, usage } = await generateText({
        model: qwenModel,
        prompt: `${schemaDescription}\n\nRequest: ${prompt || 'Generate a detailed lasagna recipe for 6 people'}\n\nRespond ONLY with valid JSON, no additional text:`,
        temperature: 0.7,
        maxOutputTokens: 1000,
      });

      console.log('Generated text:', text);

      // Try to parse the text as JSON
      let parsedObject;
      try {
        // Clean up the text - remove any markdown code blocks if present
        let cleanedText = text.trim();
        cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
        cleanedText = cleanedText.replace(/^```\s*/i, '').replace(/```\s*$/, '');
        
        parsedObject = JSON.parse(cleanedText);
        
        // Validate against schema
        const validatedObject = recipeSchema.parse(parsedObject);
        
        console.log('Successfully parsed and validated object:', validatedObject);
        
        return Response.json({
          object: validatedObject,
          finishReason,
          usage,
        });
      } catch (parseError) {
        console.error('Failed to parse JSON from text:', parseError);
        console.error('Raw text was:', text);
        
        // Return the raw text as a fallback
        return Response.json({
          object: null,
          rawText: text,
          error: 'Failed to parse JSON from model output',
          finishReason,
          usage,
        });
      }
    }
  } catch (error) {
    console.error('Generate object error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate object';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

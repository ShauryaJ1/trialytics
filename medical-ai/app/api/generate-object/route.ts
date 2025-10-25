import { generateText, generateObject } from 'ai';
import { qwenModel } from '@/lib/ai-provider';
import { z } from 'zod';

export const runtime = 'edge';
export const maxDuration = 30;

// Example: Generate a recipe object
export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    // Define a flexible schema that can coerce common model variations into a valid shape
    const DifficultySchema = z.preprocess(
      (val) => (typeof val === 'string' ? val.toLowerCase().trim() : val),
      z.enum(['easy', 'medium', 'hard'])
    );

    // Allow ingredients as either proper objects or simple strings; map strings to objects
    const IngredientSchema = z.union([
      z.object({
        item: z.string(),
        amount: z.string(),
      }),
      z
        .string()
        .transform((s) => ({ item: s, amount: '' })),
    ]);

    // Allow instructions as an array of strings or a single string (split into steps)
    const InstructionsSchema = z.union([
      z.array(z.string()),
      z
        .string()
        .transform((s) =>
          s
            .split(/\n+|\r+|\t+|\s*\d+\.?\s+|\s*-\s+/)
            .map((p) => p.trim())
            .filter(Boolean)
        ),
    ]);

    // Define the schema for the object we want to generate with coercions
    const recipeSchema = z.object({
      recipe: z.object({
        name: z.string().describe('Name of the recipe'),
        description: z.string().describe('Brief description of the dish'),
        servings: z.coerce.number().describe('Number of servings'),
        prepTime: z.string().describe('Preparation time (e.g., "15 minutes")'),
        cookTime: z.string().describe('Cooking time (e.g., "30 minutes")'),
        ingredients: z
          .array(IngredientSchema)
          .transform((arr) =>
            arr.map((ing) =>
              typeof ing === 'string' ? { item: ing, amount: '' } : ing
            )
          )
          .describe('List of ingredients with amounts'),
        instructions: InstructionsSchema.describe(
          'Step-by-step cooking instructions'
        ),
        difficulty: DifficultySchema.describe('Recipe difficulty level'),
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
        maxOutputTokens: 2000,
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
      console.log(
        'generateObject failed, falling back to generateText + manual parsing:',
        generateObjectError
      );

      // Fallback: Use generateText and parse + coerce into the Zod schema
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
        prompt: `${schemaDescription}\n\nRequest: ${
          prompt || 'Generate a detailed lasagna recipe for 6 people'
        }\n\nRespond ONLY with valid JSON, no additional text:`,
        temperature: 0.7,
        maxOutputTokens: 2000,
      });

      console.log('Generated text:', text);

      // Utilities to aggressively clean and extract JSON-like content
      const cleanJsonText = (raw: string) => {
        let s = raw.trim();
        // Remove Markdown fences
        s = s.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
        s = s.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
        // Remove trailing commas before closing braces/brackets
        s = s.replace(/,(\s*[}\]])/g, '$1');
        // Attempt to extract the longest JSON object substring
        const first = s.indexOf('{');
        const last = s.lastIndexOf('}');
        if (first !== -1 && last !== -1 && last > first) {
          s = s.slice(first, last + 1);
        }
        return s;
      };

      // Try to parse the text as JSON and coerce into the schema
      let parsedObject;
      try {
        const cleanedText = cleanJsonText(text);
        parsedObject = JSON.parse(cleanedText);

        // Validate and coerce against schema
        const validatedObject = recipeSchema.parse(parsedObject);

        console.log('Successfully parsed and validated object:', validatedObject);

        return Response.json({
          object: validatedObject,
          finishReason,
          usage,
        });
      } catch (parseError) {
        console.error('Failed to coerce/parse JSON from text:', parseError);
        console.error('Raw text was:', text);

        // Final attempt: try relaxed quote normalization, then parse
        try {
          const relaxed = cleanJsonText(text)
            // Replace single quotes around keys/strings with double quotes cautiously
            .replace(/'([^']*)'\s*:/g, '"$1":')
            .replace(/:\s*'([^']*)'/g, ': "$1"');

          const reparsed = JSON.parse(relaxed);
          const validatedObject = recipeSchema.parse(reparsed);

          return Response.json({
            object: validatedObject,
            finishReason,
            usage,
            note: 'Parsed via relaxed JSON cleanup',
          });
        } catch (finalError) {
          // Return the raw text as a fallback if all parsing attempts fail
          return Response.json({
            object: null,
            rawText: text,
            error: 'Failed to parse or coerce JSON from model output',
            finishReason,
            usage,
          });
        }
      }
    }
  } catch (error) {
    console.error('Generate object error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to generate object';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

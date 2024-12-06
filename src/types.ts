import { z } from 'zod';

// Model enums
export const OpenAIModels = z.enum(['gpt-4o', 'gpt-4', 'gpt-4-turbo']);
export const MistralModels = z.enum([
    'pixtral-large-latest',
    'mistral-large-latest',
    'mistral-small-latest',
    'pixtral-12b-2409'
]);

// Input types for tools
export const GenerateTextInput = z.object({
    provider: z.enum(["openai", "mistral"]),
    // provider: z.enum(["openai", "mistral", "mistral-agent"]),
    model: z.string(),
    agentId: z.string().optional(),
    prompt: z.string(),
    system: z.string().optional(),
    safePrompt: z.boolean().optional() // Mistral-specific option
}).refine((data): boolean => {
    // If it's a mistral-agent, require agentId
    // if (data.provider === 'mistral-agent') {
    //     return !!data.agentId;
    // }
    // For other providers (openai, mistral), require model
    return !!data.model;
}, {
    message: "agentId is required for mistral-agent, model is required for other providers"
});

export const GenerateStructuredInput = z.object({
    provider: z.enum(['openai', 'mistral']),
    model: z.union([OpenAIModels, MistralModels]),
    prompt: z.string(),
    schema: z.object({
        type: z.literal('object'),
        properties: z.record(z.any()),
        required: z.array(z.string()).optional()
    })
});

// Response types
export interface OpenAIResponse {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface StructuredResponse<T = any> {
    object: T;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

// Error types
export interface OpenAIError {
    message: string;
    type: string;
    code?: string;
    param?: string;
}


export type GenerateTextInputType = z.infer<typeof GenerateTextInput>;
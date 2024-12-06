import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { openai } from '@ai-sdk/openai';
import { mistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';
import dotenv from 'dotenv';
import {GenerateTextInput, GenerateStructuredInput, OpenAIModels} from './types.js';

dotenv.config();

const server = new Server(
    {
        name: "ai-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "generate_text",
                description: "Generate text using OpenAI or Mistral models",
                inputSchema: {
                    type: "object",
                    properties: {
                        provider: {
                            type: "string",
                            enum: ["openai", "mistral"],
                            description: "The AI provider to use"
                        },
                        model: {
                            type: "string",
                            description: "The model to use. For OpenAI: gpt-4-turbo, gpt-4, gpt-3.5-turbo. For Mistral: mistral-large-latest, mistral-small-latest, etc."
                        },
                        prompt: {
                            type: "string",
                            description: "The prompt to send to the model"
                        },
                        system: {
                            type: "string",
                            description: "Optional system prompt (supported by both providers)",
                            optional: true
                        },
                        safePrompt: {
                            type: "boolean",
                            description: "Mistral-specific: Whether to inject a safety prompt",
                            optional: true
                        }
                    },
                    required: ["provider", "model", "prompt"]
                }
            },
            {
                name: "generate_structured",
                description: "Generate structured data using AI models",
                inputSchema: {
                    type: "object",
                    properties: {
                        provider: {
                            type: "string",
                            enum: ["openai", "mistral"],
                            description: "The AI provider to use"
                        },
                        model: {
                            type: "string",
                            description: "The model to use"
                        },
                        prompt: {
                            type: "string",
                            description: "Description of what to generate"
                        },
                        schema: {
                            type: "object",
                            description: "The schema for the structured output"
                        }
                    },
                    required: ["provider", "model", "prompt", "schema"]
                }
            }
        ]
    };
});
// First define the provider handlers
const providers = {
    'openai': openai,
    // 'anthropic': anthropic,
    'mistral': mistral,
};

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        switch (request.params.name) {
            case 'generate_text': {
                const input = GenerateTextInput.parse(request.params.arguments);

                // Get the provider function
                const providerFunction = providers[input.provider];
                if (!providerFunction) {
                    throw new Error(`Provider ${input.provider} is not supported. Supported providers: ${Object.keys(providers).join(', ')}`);
                }

                if (!providerFunction) {
                    throw new Error(`Provider ${input.provider} is not supported`);
                }

                const model = providerFunction(input.model, {});

                const result = await generateText({
                    model,
                    prompt: input.prompt,
                    ...(input.system != null ? {system: input.system} : {})
                });

                return {
                    content: [{
                        type: "text",
                        text: result.text
                    }]
                };
            }

            default:
                throw new Error("Unknown tool");
        }
    } catch (error) {
        console.error('Detailed error:', error); // Add detailed error logging
        return {
            content: [{
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
});

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("OpenAI MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
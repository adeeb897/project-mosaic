/**
 * Utility to convert MCP servers to LangChain tools
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { MCPServerPlugin } from '@mosaic/shared';

/**
 * Convert JSON Schema to Zod schema for LangChain tool validation
 */
function jsonSchemaToZod(schema: any): z.ZodObject<any> {
  if (!schema || !schema.properties) {
    return z.object({}) as z.ZodObject<any>;
  }

  const shape: Record<string, any> = {};

  for (const [key, value] of Object.entries(schema.properties)) {
    const prop = value as any;

    let zodType: any;

    switch (prop.type) {
      case 'string':
        zodType = z.string();
        if (prop.description) {
          zodType = zodType.describe(prop.description);
        }
        break;
      case 'number':
        zodType = z.number();
        if (prop.description) {
          zodType = zodType.describe(prop.description);
        }
        break;
      case 'boolean':
        zodType = z.boolean();
        if (prop.description) {
          zodType = zodType.describe(prop.description);
        }
        break;
      case 'object':
        zodType = z.object({});
        if (prop.description) {
          zodType = zodType.describe(prop.description);
        }
        break;
      case 'array':
        zodType = z.array(z.any());
        if (prop.description) {
          zodType = zodType.describe(prop.description);
        }
        break;
      default:
        zodType = z.any();
    }

    // Handle optional fields
    if (!schema.required || !schema.required.includes(key)) {
      zodType = zodType.optional();
    }

    shape[key] = zodType;
  }

  return z.object(shape) as z.ZodObject<any>;
}

/**
 * Convert MCP servers to LangChain DynamicStructuredTools
 */
export function convertMCPToLangChainTools(
  mcpServers: MCPServerPlugin[]
): DynamicStructuredTool[] {
  const tools: DynamicStructuredTool[] = [];

  for (const server of mcpServers) {
    const mcpTools = server.getTools();

    for (const tool of mcpTools) {
      // Create LangChain tool name (flatten server.method)
      const toolName = `${server.name}_${tool.name}`;

      // Convert JSON Schema to Zod
      const schema = jsonSchemaToZod(tool.inputSchema);

      // Create LangChain tool
      const langchainTool = new DynamicStructuredTool({
        name: toolName,
        description: tool.description || `Tool from ${server.name}`,
        schema,
        func: async (input: any) => {
          try {
            const result = await server.invokeTool(tool.name, input);

            // Return string or JSON string for LangChain
            if (typeof result === 'string') {
              return result;
            }

            return JSON.stringify(result, null, 2);
          } catch (error: any) {
            return `Error executing ${toolName}: ${error.message}`;
          }
        },
      });

      tools.push(langchainTool);
    }
  }

  return tools;
}

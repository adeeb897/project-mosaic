/**
 * Self-Configuration MCP Server
 *
 * This built-in MCP server gives agents the ability to add, remove, and configure
 * their own MCP servers. When enabled, the agent can autonomously integrate with
 * external services by adding MCP servers.
 *
 * Example usage:
 * - User: "Enable Slack integration"
 * - Agent: Uses add_mcp_server tool to add the Slack MCP server
 * - Agent: Asks user for SLACK_API_KEY
 * - Agent: Configures the server with the API key
 */

import { MCPServerPlugin, MCPToolDefinition, MCPToolResult, MCPServerConfig } from '@mosaic/shared';
import { logger } from '../core/logger';

export interface SelfConfigCallbacks {
  onAddMCPServer: (config: MCPServerConfig) => Promise<void>;
  onRemoveMCPServer: (name: string) => Promise<void>;
  onListMCPServers: () => Promise<MCPServerConfig[]>;
}

export class SelfConfigMCPServer implements MCPServerPlugin {
  name = 'self-config';
  version = '1.0.0';
  type: 'mcp-server' = 'mcp-server';
  description = 'Allows the agent to configure its own MCP servers';

  private callbacks: SelfConfigCallbacks;

  constructor(callbacks: SelfConfigCallbacks) {
    this.callbacks = callbacks;
  }

  getTools(): MCPToolDefinition[] {
    return [
      {
        name: 'add_mcp_server',
        description: `Add a new MCP server to this agent's configuration. This allows the agent to integrate with external services like Slack, GitHub, Gmail, etc. The user may need to provide API keys or authentication information.

Common MCP servers:
- @modelcontextprotocol/server-slack - Slack integration (requires SLACK_BOT_TOKEN, SLACK_TEAM_ID)
- @modelcontextprotocol/server-github - GitHub integration (requires GITHUB_PERSONAL_ACCESS_TOKEN)
- @modelcontextprotocol/server-google-maps - Google Maps integration (requires GOOGLE_MAPS_API_KEY)
- @modelcontextprotocol/server-filesystem - File system access (requires directory path as arg)
- @modelcontextprotocol/server-sqlite - SQLite database access (requires database path as arg)
- @modelcontextprotocol/server-postgres - PostgreSQL database access (requires connection string in env)

Before adding a server, ask the user for any required API keys or configuration.`,
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Unique name for this MCP server (e.g., "slack", "github-myrepo")',
            },
            description: {
              type: 'string',
              description: 'Optional description of what this server is for',
            },
            command: {
              type: 'string',
              description: 'Command to run the MCP server (e.g., "npx", "node", "python")',
            },
            args: {
              type: 'array',
              items: { type: 'string' },
              description: 'Arguments for the command (e.g., ["-y", "@modelcontextprotocol/server-slack"])',
            },
            env: {
              type: 'object',
              description: 'Environment variables as key-value pairs (e.g., {"SLACK_BOT_TOKEN": "xoxb-..."})',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['name', 'command', 'args'],
        },
      },
      {
        name: 'remove_mcp_server',
        description: 'Remove an MCP server from this agent\'s configuration. This will disable all tools provided by that server.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the MCP server to remove',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_mcp_servers',
        description: 'List all MCP servers currently configured for this agent, including built-in and custom servers.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async invokeTool(name: string, params: any): Promise<MCPToolResult> {
    try {
      switch (name) {
        case 'add_mcp_server':
          return await this.addMCPServer(params);
        case 'remove_mcp_server':
          return await this.removeMCPServer(params);
        case 'list_mcp_servers':
          return await this.listMCPServers();
        default:
          return {
            success: false,
            error: `Unknown tool: ${name}`,
          };
      }
    } catch (error) {
      logger.error(`Self-config tool ${name} failed`, { error, params });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async addMCPServer(params: any): Promise<MCPToolResult> {
    const { name, description, command, args, env } = params;

    if (!name || typeof name !== 'string') {
      return {
        success: false,
        error: 'Missing or invalid "name" parameter',
      };
    }

    if (!command || typeof command !== 'string') {
      return {
        success: false,
        error: 'Missing or invalid "command" parameter',
      };
    }

    if (!args || !Array.isArray(args)) {
      return {
        success: false,
        error: 'Missing or invalid "args" parameter (must be an array)',
      };
    }

    const now = new Date().toISOString();
    const mcpServerConfig: MCPServerConfig = {
      created_at: now,
      updated_at: now,
      name,
      description,
      type: 'external',
      command,
      args,
      env: env || {},
    };

    try {
      await this.callbacks.onAddMCPServer(mcpServerConfig);

      logger.info(`Agent added MCP server: ${name}`, { config: mcpServerConfig });

      return {
        success: true,
        data: {
          message: `Successfully added MCP server "${name}". The server will be initialized and its tools will become available.`,
          config: mcpServerConfig,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async removeMCPServer(params: any): Promise<MCPToolResult> {
    const { name } = params;

    if (!name || typeof name !== 'string') {
      return {
        success: false,
        error: 'Missing or invalid "name" parameter',
      };
    }

    try {
      await this.callbacks.onRemoveMCPServer(name);

      logger.info(`Agent removed MCP server: ${name}`);

      return {
        success: true,
        data: {
          message: `Successfully removed MCP server "${name}". All tools from this server are no longer available.`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async listMCPServers(): Promise<MCPToolResult> {
    try {
      const servers = await this.callbacks.onListMCPServers();

      return {
        success: true,
        data: {
          servers: servers.map(s => ({
            name: s.name,
            type: s.type,
            description: s.description,
            command: s.type === 'external' ? s.command : undefined,
            args: s.type === 'external' ? s.args : undefined,
            hasEnvVars: s.env && Object.keys(s.env).length > 0,
          })),
          count: servers.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * External MCP Server - Wrapper for stdio-based MCP servers
 *
 * This class allows running external MCP servers (like those from npm packages)
 * via stdio communication, following the MCP protocol specification.
 */

import { spawn, ChildProcess } from 'child_process';
import { MCPServerPlugin, MCPToolDefinition, MCPToolResult } from '@mosaic/shared';
import { logger } from '../core/logger';

export interface ExternalMCPServerConfig {
  name: string;
  description?: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export class ExternalMCPServer implements MCPServerPlugin {
  name: string;
  version: string = '1.0.0';
  type: 'mcp-server' = 'mcp-server';
  description?: string;

  private config: ExternalMCPServerConfig;
  private process?: ChildProcess;
  private tools: MCPToolDefinition[] = [];
  private isInitialized: boolean = false;
  private requestId: number = 0;
  private pendingRequests: Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = new Map();

  constructor(config: ExternalMCPServerConfig) {
    this.config = config;
    this.name = config.name;
    this.description = config.description;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info(`Initializing external MCP server: ${this.name}`, {
      command: this.config.command,
      args: this.config.args,
    });

    try {
      // Spawn the external process
      this.process = spawn(this.config.command, this.config.args, {
        env: {
          ...process.env,
          ...this.config.env,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Set up error handling
      this.process.on('error', (error) => {
        logger.error(`External MCP server ${this.name} process error`, { error });
      });

      this.process.on('exit', (code, signal) => {
        logger.warn(`External MCP server ${this.name} exited`, { code, signal });
        this.isInitialized = false;
      });

      // Handle stderr
      this.process.stderr?.on('data', (data) => {
        logger.debug(`External MCP server ${this.name} stderr`, { data: data.toString() });
      });

      // Handle stdout (JSON-RPC messages)
      let buffer = '';
      this.process.stdout?.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line);
              this.handleMessage(message);
            } catch (error) {
              logger.error(`Failed to parse message from ${this.name}`, { line, error });
            }
          }
        }
      });

      // Initialize the MCP server - send initialize request
      const initResponse = await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: 'project-mosaic',
          version: '1.0.0',
        },
      });

      logger.info(`External MCP server ${this.name} initialized`, { initResponse });

      // List available tools
      const toolsResponse = await this.sendRequest('tools/list', {});

      if (toolsResponse.tools && Array.isArray(toolsResponse.tools)) {
        this.tools = toolsResponse.tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description || '',
          inputSchema: tool.inputSchema || { type: 'object', properties: {} },
        }));

        logger.info(`External MCP server ${this.name} loaded ${this.tools.length} tools`, {
          tools: this.tools.map(t => t.name),
        });
      }

      this.isInitialized = true;
    } catch (error) {
      logger.error(`Failed to initialize external MCP server ${this.name}`, { error });
      throw error;
    }
  }

  private handleMessage(message: any): void {
    // Handle JSON-RPC response
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(new Error(message.error.message || 'Unknown error'));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  private async sendRequest(method: string, params: any): Promise<any> {
    if (!this.process || !this.process.stdin) {
      throw new Error(`External MCP server ${this.name} not running`);
    }

    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Set timeout
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout for ${method}`));
        }
      }, 30000); // 30 second timeout

      // Clear timeout on resolution
      const originalResolve = resolve;
      const originalReject = reject;

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          originalResolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          originalReject(error);
        },
      });

      // Send request
      this.process!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  getTools(): MCPToolDefinition[] {
    return this.tools;
  }

  async invokeTool(name: string, params: any): Promise<MCPToolResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.debug(`Invoking tool ${name} on external MCP server ${this.name}`, { params });

      const response = await this.sendRequest('tools/call', {
        name,
        arguments: params,
      });

      logger.debug(`Tool ${name} response from ${this.name}`, { response });

      return {
        success: true,
        data: response.content || response,
      };
    } catch (error) {
      logger.error(`Failed to invoke tool ${name} on ${this.name}`, { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async shutdown(): Promise<void> {
    if (this.process) {
      logger.info(`Shutting down external MCP server: ${this.name}`);
      this.process.kill();
      this.process = undefined;
      this.isInitialized = false;
      this.pendingRequests.clear();
    }
  }
}

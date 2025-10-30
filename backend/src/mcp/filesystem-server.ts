/**
 * Filesystem MCP Server - Provides file operations to agents
 */
import {
  MCPServerPlugin,
  PluginContext,
  MCPToolDefinition,
  MCPToolResult,
} from '@mosaic/shared';
import * as fs from 'fs/promises';
import * as path from 'path';

export class FilesystemMCPServer implements MCPServerPlugin {
  name = 'filesystem';
  version = '1.0.0';
  type: 'mcp-server' = 'mcp-server';

  metadata = {
    author: 'Project Mosaic',
    description: 'Provides file system operations for agents',
    license: 'MIT',
  };

  private workspaceRoot: string;
  private context?: PluginContext;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot || path.join(process.cwd(), 'workspace');
  }

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    // Ensure workspace directory exists
    await fs.mkdir(this.workspaceRoot, { recursive: true });

    context.logger.info('Filesystem MCP server initialized', {
      workspace: this.workspaceRoot,
    });
  }

  async shutdown(): Promise<void> {
    this.context?.logger.info('Filesystem MCP server shutting down');
  }

  getTools(): MCPToolDefinition[] {
    return [
      {
        name: 'read_file',
        description: 'Read the contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file relative to workspace',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: 'Write content to a file (creates if doesn\'t exist)',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file relative to workspace',
            },
            content: {
              type: 'string',
              description: 'Content to write to the file',
            },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'list_files',
        description: 'List files in a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the directory (empty for root)',
            },
          },
        },
      },
      {
        name: 'delete_file',
        description: 'Delete a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to delete',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'create_directory',
        description: 'Create a new directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the directory to create',
            },
          },
          required: ['path'],
        },
      },
    ];
  }

  async invokeTool(name: string, params: any): Promise<MCPToolResult> {
    try {
      this.context?.logger.debug('Invoking filesystem tool', { name, params });

      switch (name) {
        case 'read_file':
          if (!params.path) {
            return {
              success: false,
              error: 'Missing required parameter: path',
            };
          }
          return await this.readFile(params.path);

        case 'write_file':
          if (!params.path) {
            return {
              success: false,
              error: 'Missing required parameter: path',
            };
          }
          if (params.content === undefined || params.content === null) {
            return {
              success: false,
              error: 'Missing required parameter: content',
            };
          }
          return await this.writeFile(params.path, params.content);

        case 'list_files':
          return await this.listFiles(params.path || '');

        case 'delete_file':
          if (!params.path) {
            return {
              success: false,
              error: 'Missing required parameter: path',
            };
          }
          return await this.deleteFile(params.path);

        case 'create_directory':
          if (!params.path) {
            return {
              success: false,
              error: 'Missing required parameter: path',
            };
          }
          return await this.createDirectory(params.path);

        default:
          return {
            success: false,
            error: `Unknown tool: ${name}`,
          };
      }
    } catch (error: any) {
      this.context?.logger.error('Tool invocation failed', { name, error });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async readFile(filePath: string): Promise<MCPToolResult> {
    const fullPath = this.resolveWorkspacePath(filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    return {
      success: true,
      data: {
        path: filePath,
        content,
        size: content.length,
      },
    };
  }

  private async writeFile(filePath: string, content: string): Promise<MCPToolResult> {
    const fullPath = this.resolveWorkspacePath(filePath);

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    await fs.writeFile(fullPath, content, 'utf-8');

    return {
      success: true,
      data: {
        path: filePath,
        size: content.length,
        message: 'File written successfully',
      },
    };
  }

  private async listFiles(dirPath: string): Promise<MCPToolResult> {
    const fullPath = this.resolveWorkspacePath(dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    const files = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(fullPath, entry.name);
        const stats = await fs.stat(entryPath);

        return {
          name: entry.name,
          path: path.join(dirPath, entry.name),
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        };
      })
    );

    return {
      success: true,
      data: {
        path: dirPath,
        files,
        count: files.length,
      },
    };
  }

  private async deleteFile(filePath: string): Promise<MCPToolResult> {
    const fullPath = this.resolveWorkspacePath(filePath);
    await fs.unlink(fullPath);

    return {
      success: true,
      data: {
        path: filePath,
        message: 'File deleted successfully',
      },
    };
  }

  private async createDirectory(dirPath: string): Promise<MCPToolResult> {
    const fullPath = this.resolveWorkspacePath(dirPath);
    await fs.mkdir(fullPath, { recursive: true });

    return {
      success: true,
      data: {
        path: dirPath,
        message: 'Directory created successfully',
      },
    };
  }

  /**
   * Resolve workspace-relative path to absolute path
   * Prevents directory traversal attacks
   */
  private resolveWorkspacePath(relativePath: string): string {
    const fullPath = path.resolve(this.workspaceRoot, relativePath);

    // Security check: ensure path is within workspace
    if (!fullPath.startsWith(this.workspaceRoot)) {
      throw new Error('Path outside workspace is not allowed');
    }

    return fullPath;
  }
}

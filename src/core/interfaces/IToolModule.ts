/**
 * Interface for tool modules
 */
import { IModule } from './IModule';
import { ToolDefinition } from '../models/ToolDefinition';
import { ValidationResult } from '../models/ValidationResult';
import { ExecutionContext } from '../models/ExecutionContext';
import { ToolResult } from '../models/ToolResult';
import { MCPToolDefinition } from '../models/MCPToolDefinition';
import { MCPRequest } from '../models/MCPRequest';
import { MCPResponse } from '../models/MCPResponse';
import { ToolUIComponents } from '../models/ToolUIComponents';
import { ToolRenderOptions } from '../models/ToolRenderOptions';

export interface IToolModule extends IModule {
  // Tool Definition
  getToolDefinition(): ToolDefinition;

  // Execution
  validateParameters(params: Record<string, any>): Promise<ValidationResult>;
  execute(params: Record<string, any>, context: ExecutionContext): Promise<ToolResult>;

  // MCP Integration
  getMCPDefinition(): MCPToolDefinition;
  handleMCPRequest(request: MCPRequest): Promise<MCPResponse>;

  // UI Components
  getUIComponents(): ToolUIComponents;
  getRenderOptions(): ToolRenderOptions;
}

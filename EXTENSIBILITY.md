# Project Mosaic - Extensibility Guide

> **How to extend and customize Project Mosaic with your own components**

## Overview

Project Mosaic is designed with modularity at its core. Every major component can be extended, replaced, or customized without modifying the core codebase. This guide explains how to create custom:

- Agent types
- MCP servers (custom tools)
- LLM providers
- Sandbox providers
- Observability backends
- Communication protocols

---

## Plugin System Architecture

### Core Plugin Interface

All plugins implement a common interface:

```typescript
interface Plugin {
  /** Unique identifier for the plugin */
  name: string;

  /** Semantic version */
  version: string;

  /** Plugin type for categorization */
  type: 'agent' | 'mcp-server' | 'llm-provider' | 'sandbox' | 'observability' | 'protocol';

  /** Plugin metadata */
  metadata: {
    author: string;
    description: string;
    homepage?: string;
    license?: string;
  };

  /** Initialize the plugin with context */
  initialize(context: PluginContext): Promise<void>;

  /** Graceful shutdown */
  shutdown(): Promise<void>;

  /** Health check */
  healthCheck?(): Promise<boolean>;
}

interface PluginContext {
  /** Configuration for this plugin */
  config: Record<string, any>;

  /** Logger instance */
  logger: Logger;

  /** Event bus for pub/sub */
  eventBus: EventBus;

  /** Access to other registered plugins */
  plugins: PluginRegistry;
}
```

### Plugin Registration

Plugins are registered via configuration:

```json
// config/plugins/custom-agent.json
{
  "enabled": true,
  "path": "./plugins/my-custom-agent",
  "config": {
    "model": "gpt-4",
    "temperature": 0.7
  }
}
```

Or programmatically:

```typescript
import { PluginRegistry } from '@mosaic/core';
import { MyCustomAgent } from './plugins/my-custom-agent';

const registry = new PluginRegistry();
await registry.register(new MyCustomAgent());
```

---

## Extension Points

### 1. Custom Agent Types

Create custom agent implementations with specialized behaviors.

#### Base Interface

```typescript
interface AgentPlugin extends Plugin {
  type: 'agent';

  /** Create a new agent instance */
  createAgent(config: AgentConfig): Promise<Agent>;

  /** Agent capability advertisement (A2A Agent Card) */
  getCapabilities(): AgentCard;
}

interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'paused' | 'error';

  /** Start the agent */
  start(): Promise<void>;

  /** Stop the agent */
  stop(): Promise<void>;

  /** Send message to agent (A2A) */
  sendMessage(message: A2AMessage): Promise<void>;

  /** Receive message from agent */
  onMessage(handler: (message: A2AMessage) => void): void;

  /** Execute a task */
  executeTask(task: Task): Promise<TaskResult>;
}
```

#### Example: Custom Research Agent

```typescript
import { AgentPlugin, Agent, AgentConfig, AgentCard } from '@mosaic/core';

export class ResearchAgentPlugin implements AgentPlugin {
  name = 'research-agent';
  version = '1.0.0';
  type = 'agent' as const;

  metadata = {
    author: 'Your Name',
    description: 'Specialized agent for research tasks',
    license: 'MIT'
  };

  async initialize(context: PluginContext): Promise<void> {
    context.logger.info('Research agent plugin initialized');
  }

  async shutdown(): Promise<void> {
    // Cleanup
  }

  async createAgent(config: AgentConfig): Promise<Agent> {
    return new ResearchAgent(config);
  }

  getCapabilities(): AgentCard {
    return {
      name: 'research-agent',
      description: 'Performs web research and fact-checking',
      capabilities: [
        {
          name: 'web_search',
          description: 'Search the web for information',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' }
            }
          }
        },
        {
          name: 'fact_check',
          description: 'Verify claims against trusted sources',
          inputSchema: {
            type: 'object',
            properties: {
              claim: { type: 'string' }
            }
          }
        }
      ]
    };
  }
}

class ResearchAgent implements Agent {
  // Implementation details...
}
```

#### Configuration

```json
// config/plugins/research-agent.json
{
  "enabled": true,
  "path": "./plugins/research-agent",
  "config": {
    "searchEngine": "brave",
    "maxResults": 10,
    "factCheckSources": ["wikipedia", "reuters", "ap"]
  }
}
```

---

### 2. Custom MCP Servers (Tools)

Expose custom tools and resources to agents via Model Context Protocol.

#### Base Interface

```typescript
interface MCPServerPlugin extends Plugin {
  type: 'mcp-server';

  /** Get available tools */
  getTools(): MCPToolDefinition[];

  /** Get available resources */
  getResources?(): MCPResourceDefinition[];

  /** Get available prompts */
  getPrompts?(): MCPPromptDefinition[];

  /** Handle tool invocation */
  invokeTool(name: string, params: any): Promise<MCPToolResult>;

  /** Handle resource read */
  readResource?(uri: string): Promise<MCPResourceContent>;
}
```

#### Example: Database MCP Server

```typescript
import { MCPServerPlugin, MCPToolDefinition, MCPToolResult } from '@mosaic/core';
import { Client } from 'pg';

export class DatabaseMCPServer implements MCPServerPlugin {
  name = 'database-mcp-server';
  version = '1.0.0';
  type = 'mcp-server' as const;

  metadata = {
    author: 'Your Name',
    description: 'Provides database access to agents',
    license: 'MIT'
  };

  private client: Client;

  async initialize(context: PluginContext): Promise<void> {
    this.client = new Client({
      connectionString: context.config.databaseUrl
    });
    await this.client.connect();
    context.logger.info('Database MCP server initialized');
  }

  async shutdown(): Promise<void> {
    await this.client.end();
  }

  getTools(): MCPToolDefinition[] {
    return [
      {
        name: 'db_query',
        description: 'Execute a SQL query',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL query to execute'
            },
            params: {
              type: 'array',
              items: { type: 'string' },
              description: 'Query parameters'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'db_list_tables',
        description: 'List all tables in the database',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  async invokeTool(name: string, params: any): Promise<MCPToolResult> {
    switch (name) {
      case 'db_query':
        const result = await this.client.query(params.query, params.params);
        return {
          success: true,
          data: result.rows
        };

      case 'db_list_tables':
        const tables = await this.client.query(`
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public'
        `);
        return {
          success: true,
          data: tables.rows.map(r => r.tablename)
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
```

#### Configuration

```json
// config/plugins/database-mcp.json
{
  "enabled": true,
  "path": "./plugins/database-mcp-server",
  "config": {
    "databaseUrl": "postgresql://user:pass@localhost/mosaic",
    "allowedOperations": ["SELECT", "INSERT", "UPDATE"],
    "maxResults": 1000
  }
}
```

---

### 3. Custom LLM Providers

Swap out the LLM provider or add support for local models.

#### Base Interface

```typescript
interface LLMProviderPlugin extends Plugin {
  type: 'llm-provider';

  /** Generate completion */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /** Generate completion with streaming */
  streamComplete?(request: CompletionRequest): AsyncIterator<CompletionChunk>;

  /** Get available models */
  getModels(): Promise<ModelInfo[]>;

  /** Check if provider supports a feature */
  supportsFeature(feature: 'streaming' | 'function-calling' | 'vision'): boolean;
}

interface CompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
}
```

#### Example: Local Ollama Provider

```typescript
import { LLMProviderPlugin, CompletionRequest, CompletionResponse } from '@mosaic/core';
import { Ollama } from 'ollama';

export class OllamaProvider implements LLMProviderPlugin {
  name = 'ollama-provider';
  version = '1.0.0';
  type = 'llm-provider' as const;

  metadata = {
    author: 'Your Name',
    description: 'Local LLM provider using Ollama',
    license: 'MIT'
  };

  private ollama: Ollama;

  async initialize(context: PluginContext): Promise<void> {
    this.ollama = new Ollama({
      host: context.config.host || 'http://localhost:11434'
    });
    context.logger.info('Ollama provider initialized');
  }

  async shutdown(): Promise<void> {
    // Cleanup
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const response = await this.ollama.chat({
      model: request.model,
      messages: request.messages,
      options: {
        temperature: request.temperature,
        num_predict: request.maxTokens
      }
    });

    return {
      message: {
        role: 'assistant',
        content: response.message.content
      },
      usage: {
        promptTokens: response.prompt_eval_count,
        completionTokens: response.eval_count,
        totalTokens: response.prompt_eval_count + response.eval_count
      }
    };
  }

  async getModels(): Promise<ModelInfo[]> {
    const list = await this.ollama.list();
    return list.models.map(m => ({
      id: m.name,
      name: m.name,
      contextWindow: m.details?.parameter_size || 4096
    }));
  }

  supportsFeature(feature: string): boolean {
    return feature === 'streaming';
  }
}
```

#### Configuration

```json
// config/plugins/ollama-provider.json
{
  "enabled": true,
  "path": "./plugins/ollama-provider",
  "config": {
    "host": "http://localhost:11434",
    "defaultModel": "llama3.2",
    "keepAlive": "5m"
  }
}
```

#### Switch Provider via Environment

```bash
# Use OpenAI (default)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Use Anthropic
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Use local Ollama
LLM_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
```

---

### 4. Custom Sandbox Providers

Add custom isolation mechanisms beyond E2B and Docker.

#### Base Interface

```typescript
interface SandboxProviderPlugin extends Plugin {
  type: 'sandbox';

  /** Create a new sandbox instance */
  createSandbox(config: SandboxConfig): Promise<Sandbox>;

  /** List active sandboxes */
  listSandboxes(): Promise<SandboxInfo[]>;

  /** Get sandbox by ID */
  getSandbox(id: string): Promise<Sandbox>;

  /** Destroy sandbox */
  destroySandbox(id: string): Promise<void>;
}

interface Sandbox {
  id: string;
  status: 'initializing' | 'ready' | 'running' | 'stopped' | 'error';

  /** Execute code in sandbox */
  execute(code: string, options?: ExecutionOptions): Promise<ExecutionResult>;

  /** Upload file to sandbox */
  uploadFile(path: string, content: Buffer): Promise<void>;

  /** Download file from sandbox */
  downloadFile(path: string): Promise<Buffer>;

  /** Stop sandbox */
  stop(): Promise<void>;
}
```

#### Example: Firecracker Sandbox Provider

```typescript
import { SandboxProviderPlugin, Sandbox, SandboxConfig } from '@mosaic/core';

export class FirecrackerProvider implements SandboxProviderPlugin {
  name = 'firecracker-provider';
  version = '1.0.0';
  type = 'sandbox' as const;

  metadata = {
    author: 'Your Name',
    description: 'Firecracker micro-VM sandbox provider',
    license: 'MIT'
  };

  private sandboxes = new Map<string, FirecrackerSandbox>();

  async initialize(context: PluginContext): Promise<void> {
    // Initialize Firecracker
    context.logger.info('Firecracker provider initialized');
  }

  async createSandbox(config: SandboxConfig): Promise<Sandbox> {
    const sandbox = new FirecrackerSandbox(config);
    await sandbox.initialize();
    this.sandboxes.set(sandbox.id, sandbox);
    return sandbox;
  }

  // ... other methods
}
```

---

### 5. Custom Observability Backends

Replace or supplement LangSmith with custom monitoring.

#### Base Interface

```typescript
interface ObservabilityPlugin extends Plugin {
  type: 'observability';

  /** Track event */
  trackEvent(event: ObservabilityEvent): Promise<void>;

  /** Start trace span */
  startSpan(name: string, attributes?: Record<string, any>): Span;

  /** Track metric */
  trackMetric(name: string, value: number, tags?: Record<string, string>): Promise<void>;

  /** Log message */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: any): Promise<void>;
}

interface Span {
  end(result?: 'success' | 'error', metadata?: any): void;
  setAttribute(key: string, value: any): void;
  addEvent(name: string, attributes?: any): void;
}
```

#### Example: DataDog Integration

```typescript
import { ObservabilityPlugin, ObservabilityEvent, Span } from '@mosaic/core';
import tracer from 'dd-trace';

export class DataDogObservability implements ObservabilityPlugin {
  name = 'datadog-observability';
  version = '1.0.0';
  type = 'observability' as const;

  metadata = {
    author: 'Your Name',
    description: 'DataDog observability integration',
    license: 'MIT'
  };

  async initialize(context: PluginContext): Promise<void> {
    tracer.init({
      service: 'project-mosaic',
      env: context.config.environment
    });
    context.logger.info('DataDog observability initialized');
  }

  async trackEvent(event: ObservabilityEvent): Promise<void> {
    tracer.trace(event.name, span => {
      span.setTag('event.type', event.type);
      span.setTag('agent.id', event.agentId);
      // ... add more tags
    });
  }

  startSpan(name: string, attributes?: Record<string, any>): Span {
    const ddSpan = tracer.startSpan(name);

    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        ddSpan.setTag(key, value);
      });
    }

    return {
      end: (result, metadata) => {
        if (result === 'error') {
          ddSpan.setTag('error', true);
        }
        ddSpan.finish();
      },
      setAttribute: (key, value) => ddSpan.setTag(key, value),
      addEvent: (name, attrs) => {
        // Log as span event
        ddSpan.log({ event: name, ...attrs });
      }
    };
  }

  // ... other methods
}
```

---

### 6. Custom Communication Protocols

Extend beyond A2A with custom agent communication.

#### Base Interface

```typescript
interface CommunicationProtocolPlugin extends Plugin {
  type: 'protocol';

  /** Send message */
  sendMessage(from: string, to: string, message: any): Promise<void>;

  /** Broadcast message */
  broadcast(from: string, message: any): Promise<void>;

  /** Subscribe to messages */
  onMessage(agentId: string, handler: MessageHandler): Unsubscribe;

  /** Discover available agents */
  discoverAgents(): Promise<AgentInfo[]>;
}
```

---

## Plugin Development Workflow

### 1. Create Plugin Structure

```bash
plugins/
└── my-custom-agent/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts           # Plugin entry point
    │   └── agent.ts           # Agent implementation
    └── config/
        └── default.json       # Default config
```

### 2. Implement Plugin Interface

```typescript
// plugins/my-custom-agent/src/index.ts
import { AgentPlugin } from '@mosaic/core';

export class MyCustomAgent implements AgentPlugin {
  // ... implementation
}

// Export plugin
export default MyCustomAgent;
```

### 3. Add Package Metadata

```json
// plugins/my-custom-agent/package.json
{
  "name": "@mosaic/plugin-my-custom-agent",
  "version": "1.0.0",
  "main": "dist/index.js",
  "mosaic": {
    "type": "agent",
    "minVersion": "2.0.0"
  },
  "dependencies": {
    "@mosaic/core": "^2.0.0"
  }
}
```

### 4. Register Plugin

```json
// config/plugins.json
{
  "plugins": [
    {
      "name": "my-custom-agent",
      "path": "./plugins/my-custom-agent",
      "enabled": true,
      "config": {}
    }
  ]
}
```

### 5. Test Plugin

```typescript
// plugins/my-custom-agent/test/index.test.ts
import { MyCustomAgent } from '../src';
import { createTestContext } from '@mosaic/test-utils';

describe('MyCustomAgent', () => {
  it('should initialize', async () => {
    const plugin = new MyCustomAgent();
    const context = createTestContext();
    await plugin.initialize(context);
    expect(plugin.name).toBe('my-custom-agent');
  });
});
```

---

## Best Practices

### 1. Configuration

- Use environment variables for secrets
- Provide sensible defaults
- Validate configuration on initialize
- Support hot-reload when possible

### 2. Error Handling

- Always handle errors gracefully
- Log errors with context
- Return meaningful error messages
- Implement retry logic for transient failures

### 3. Performance

- Implement connection pooling
- Cache expensive operations
- Use async/await for I/O
- Monitor resource usage

### 4. Security

- Validate all inputs
- Sanitize file paths
- Use parameterized queries
- Implement rate limiting
- Never log sensitive data

### 5. Testing

- Write unit tests for core logic
- Integration tests for external services
- Mock external dependencies
- Test error scenarios

### 6. Documentation

- Document all public APIs
- Provide usage examples
- Document configuration options
- Include troubleshooting guide

---

## Publishing Plugins

### NPM Package

```bash
# Build plugin
npm run build

# Publish to NPM
npm publish --access public
```

### Plugin Registry (Future)

```bash
# Submit to official registry
mosaic plugin publish
```

---

## Example Plugins

Check out these example plugins:

- [Database MCP Server](./examples/plugins/database-mcp-server/)
- [Slack Integration](./examples/plugins/slack-integration/)
- [Custom Researcher Agent](./examples/plugins/researcher-agent/)
- [Local Ollama Provider](./examples/plugins/ollama-provider/)

---

## Support

- **Documentation**: [https://mosaic.dev/docs](https://mosaic.dev/docs)
- **Community Discord**: [https://discord.gg/mosaic](https://discord.gg/mosaic)
- **GitHub Discussions**: [https://github.com/mosaic/mosaic/discussions](https://github.com/mosaic/mosaic/discussions)

---

## Contributing

Want to contribute a plugin to the official collection? See [CONTRIBUTING.md](./CONTRIBUTING.md).

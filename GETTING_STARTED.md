# Getting Started with Project Mosaic

Welcome to Project Mosaic! This guide will help you get up and running quickly.

## What You've Got

The foundation for a modular, extensible AI agent platform with:

✅ **Complete Documentation**
- [README.md](./README.md) - Project overview and quick start
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design deep-dive
- [EXTENSIBILITY.md](./EXTENSIBILITY.md) - Plugin development guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment options (cloud/local)
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines

✅ **Project Structure**
```
project-mosaic/
├── backend/          # Backend services (ready for implementation)
├── frontend/         # Admin dashboard (ready for implementation)
├── shared/           # Shared TypeScript types ✓ COMPLETE
├── config/           # Configuration files ✓ COMPLETE
├── plugins/          # Custom plugins directory
└── docs/             # Additional documentation
```

✅ **Core Interfaces & Types**
- Complete TypeScript type definitions in [shared/types/index.ts](./shared/types/index.ts)
- Plugin system interfaces
- Agent, MCP, LLM, Sandbox, Observability contracts

✅ **Configuration System**
- Environment-based config ([.env.example](./.env.example))
- JSON config files ([config/](./config/))
- Docker Compose for local development
- Swappable providers (LLM, sandbox, observability)

---

## Next Steps: Start Coding!

### Option 1: Start with Core Services (Recommended)

Implement the backend foundation:

1. **Set up the plugin registry system**
   ```bash
   # Create: backend/src/core/plugin-registry.ts
   ```

2. **Implement event bus (Redis-based)**
   ```bash
   # Create: backend/src/core/event-bus.ts
   ```

3. **Build the first MCP server (Filesystem)**
   ```bash
   # Create: backend/src/mcp/filesystem-server.ts
   ```

4. **Integrate LangGraph.js**
   ```bash
   # Create: backend/src/agents/langgraph-orchestrator.ts
   ```

5. **Implement A2A Protocol**
   ```bash
   # Create: backend/src/agents/a2a-protocol.ts
   ```

### Option 2: Build a Simple Demo First

Create a minimal working example:

1. **Simple agent that can read/write files**
2. **Basic admin UI to see agent activity**
3. **Test the modularity by swapping LLM providers**

### Option 3: Start with Frontend

Build the admin dashboard UI:

1. **Set up Next.js app structure**
2. **Create agent monitoring components**
3. **Implement WebSocket connection for real-time updates**
4. **Build file explorer UI**

---

## Development Workflow

### 1. Local Development Setup

```bash
# Clone (if you haven't already)
git clone <your-repo>
cd project-mosaic

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and add your API keys:
# - OPENAI_API_KEY or ANTHROPIC_API_KEY
# - E2B_API_KEY (optional, for cloud sandboxes)
# - LANGSMITH_API_KEY (optional, for observability)

# Start infrastructure (PostgreSQL, Redis, Ollama)
docker-compose up -d postgres redis ollama

# Run database migrations (once implemented)
npm run db:migrate
```

### 2. Development Commands

```bash
# Start everything
npm run dev

# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend

# Run tests
npm run test

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

### 3. Testing Plugin System

Once implemented, test the modularity:

```bash
# Test with OpenAI
LLM_PROVIDER=openai npm run dev

# Test with Anthropic
LLM_PROVIDER=anthropic npm run dev

# Test with local Ollama
LLM_PROVIDER=ollama npm run dev

# Test with Docker sandboxes (default)
SANDBOX_PROVIDER=docker npm run dev

# Test with E2B cloud sandboxes
SANDBOX_PROVIDER=e2b npm run dev
```

---

## Recommended Implementation Order

### Phase 1: Foundation (2-3 days)
1. ✅ Plugin registry system
2. ✅ Event bus (Redis)
3. ✅ Logger setup
4. ✅ Database connection
5. ✅ Basic Express server
6. ✅ Health check endpoint

### Phase 2: Core Agent System (3-5 days)
1. ✅ LLM provider abstraction
2. ✅ OpenAI provider implementation
3. ✅ LangGraph.js integration
4. ✅ Basic agent creation/management
5. ✅ Agent state management

### Phase 3: MCP Servers (3-4 days)
1. ✅ MCP protocol implementation
2. ✅ Filesystem MCP server
3. ✅ Memory MCP server
4. ✅ Tool invocation system

### Phase 4: A2A Protocol (2-3 days)
1. ✅ A2A message handling
2. ✅ Agent Card generation
3. ✅ Agent discovery
4. ✅ Inter-agent messaging

### Phase 5: Sandbox Integration (2-3 days)
1. ✅ Sandbox provider abstraction
2. ✅ Docker provider
3. ✅ E2B provider (optional)
4. ✅ Code execution

### Phase 6: Admin Dashboard (5-7 days)
1. ✅ Next.js setup
2. ✅ WebSocket integration
3. ✅ Agent list UI
4. ✅ Event stream UI
5. ✅ File explorer UI
6. ✅ Agent controls

### Phase 7: Polish & Testing (3-5 days)
1. ✅ Write tests
2. ✅ Error handling
3. ✅ Performance optimization
4. ✅ Documentation examples
5. ✅ Demo video

**Total Estimated Time: 3-4 weeks for MVP**

---

## Key Design Principles to Remember

### 1. **Modularity First**
Every component should be swappable:
```typescript
// Bad - tightly coupled
import { OpenAI } from 'openai';
const llm = new OpenAI(apiKey);

// Good - use abstraction
const llm = pluginRegistry.get('llm-provider');
await llm.complete(request);
```

### 2. **Configuration Over Code**
Use environment variables and config files:
```typescript
// Bad - hardcoded
const model = 'gpt-4';

// Good - configurable
const model = config.get('agents.defaultModel');
```

### 3. **Event-Driven**
Everything is an event for observability:
```typescript
// Emit events for all important actions
eventBus.publish('agent.created', { agentId, name, type });
eventBus.publish('tool.invoked', { agentId, tool, params });
```

### 4. **Type Safety**
Use the shared types:
```typescript
import { Agent, AgentConfig, AgentPlugin } from '@mosaic/shared';
```

### 5. **Error Handling**
Always handle errors gracefully:
```typescript
try {
  await agent.executeTask(task);
} catch (error) {
  logger.error('Task execution failed', { error, taskId: task.id });
  eventBus.publish('task.failed', { taskId: task.id, error });
}
```

---

## Common Patterns

### Creating a Plugin

```typescript
import { Plugin, PluginContext } from '@mosaic/shared';

export class MyPlugin implements Plugin {
  name = 'my-plugin';
  version = '1.0.0';
  type = 'agent'; // or 'mcp-server', 'llm-provider', etc.

  metadata = {
    author: 'Your Name',
    description: 'Does something cool',
    license: 'MIT'
  };

  async initialize(context: PluginContext): Promise<void> {
    context.logger.info('Plugin initialized');
  }

  async shutdown(): Promise<void> {
    // Cleanup
  }
}
```

### Using the Event Bus

```typescript
// Publish event
await eventBus.publish('agent.message', {
  id: uuid(),
  type: 'agent.message',
  source: agentId,
  data: message,
  timestamp: new Date().toISOString()
});

// Subscribe to events
eventBus.subscribe('agent.*', async (event) => {
  console.log('Agent event:', event);
});
```

### Calling LLM Provider

```typescript
const llmProvider = pluginRegistry.get('llm-provider') as LLMProviderPlugin;

const response = await llmProvider.complete({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Hello!' }
  ],
  temperature: 0.7
});

console.log(response.message.content);
```

---

## Resources

### Documentation
- [LangGraph.js Docs](https://js.langchain.com/docs/langgraph)
- [A2A Protocol Spec](https://a2a-protocol.org/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [E2B Documentation](https://e2b.dev/docs)

### Examples
- Check `plugins/examples/` for plugin examples (once created)
- See `backend/src/examples/` for usage examples (once created)

### Community
- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: Questions and ideas
- Discord: Real-time chat (coming soon)

---

## Need Help?

1. **Check the docs** - Most questions are answered in:
   - [ARCHITECTURE.md](./ARCHITECTURE.md)
   - [EXTENSIBILITY.md](./EXTENSIBILITY.md)
   - [DEPLOYMENT.md](./DEPLOYMENT.md)

2. **Review the types** - [shared/types/index.ts](./shared/types/index.ts) has all interfaces

3. **Ask questions** - Open a GitHub Discussion

4. **Report bugs** - Open a GitHub Issue

---

## Congratulations!

You have a solid foundation for building a production-ready multi-agent AI platform. The hard architectural decisions are made, the interfaces are defined, and the system is designed for extensibility.

Now it's time to build! Start with Phase 1, implement the core services, and watch your AI agent village come to life.

**Happy coding!** 🚀

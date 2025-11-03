# Project Mosaic - Architecture Documentation

> **Version**: 2.0
> **Last Updated**: 2025-10-29
> **Status**: Foundation Phase

## Overview

Project Mosaic 2.0 is a self-contained environment for AI agents to run together, interact with each other, access shared resources (filesystem, browser), and be monitored/managed through an admin interface.

**Inspiration**: Based on concepts from [AI Village](https://theaidigest.org/village) - a multi-agent simulation platform.

---

## Core Principles

1. **Modularity First**: Every component is swappable and extensible
2. **Protocol-Driven**: Use open standards (A2A, MCP) for interoperability
3. **Deploy Anywhere**: Support both cloud and local deployments
4. **Observability Built-In**: All interactions are traceable and monitorable
5. **Security by Default**: Sandboxed execution with proper isolation

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN DASHBOARD (Frontend)                  │
│                   React + Socket.io + TailwindCSS                │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Agent Monitor│  │  Event Stream│  │ File Explorer│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │Browser Viewer│  │ Agent Controls│  │ Task Manager │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ WebSocket (Real-time)
                              │ REST (CRUD Operations)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVICES (Node.js)                   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               Agent Orchestration Layer                     │ │
│  │                                                              │ │
│  │  ┌──────────────────┐        ┌──────────────────┐         │ │
│  │  │  LangGraph.js    │◄──────►│  A2A Protocol    │         │ │
│  │  │  Orchestrator    │        │  (Agent Comms)   │         │ │
│  │  └──────────────────┘        └──────────────────┘         │ │
│  │           │                            │                    │ │
│  │           │ Manages                    │ Coordinates        │ │
│  │           ▼                            ▼                    │ │
│  │  ┌────────────────────────────────────────────┐           │ │
│  │  │         Agent Pool (Agent Instances)        │           │ │
│  │  │  Agent A  │  Agent B  │  Agent C  │  ...   │           │ │
│  │  └────────────────────────────────────────────┘           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                 MCP Server Layer (Tools)                    │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │ Filesystem   │  │   Browser    │  │    Memory    │    │ │
│  │  │ MCP Server   │  │  MCP Server  │  │  MCP Server  │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  │         │                  │                  │            │ │
│  │         ▼                  ▼                  ▼            │ │
│  │  ┌────────────────────────────────────────────────┐      │ │
│  │  │          Resource Access Layer                 │      │ │
│  │  └────────────────────────────────────────────────┘      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  API & Communication Layer                  │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │   Express    │  │  Socket.io   │  │  Event Bus   │    │ │
│  │  │  REST API    │  │   Server     │  │   (Redis)    │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Infrastructure Layer                        │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Sandbox     │  │  Database    │  │ Observability│          │
│  │  (E2B/Docker)│  │ (PostgreSQL) │  │ (LangSmith)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. Agent Orchestration Layer

**Purpose**: Manage agent lifecycle, coordination, and communication.

**Core Technologies**:
- **LangGraph.js**: Graph-based agent orchestration with state management
- **A2A Protocol**: Agent-to-agent communication standard (Google)

**Responsibilities**:
- Agent creation, deletion, pause/resume
- Agent state management
- Task assignment and coordination
- Message routing between agents
- Agent capability discovery via Agent Cards

**Extension Points**:
- Custom agent types via plugin system
- Custom orchestration strategies
- Custom communication patterns

---

### 2. MCP Server Layer

**Purpose**: Provide standardized tool access for agents using Model Context Protocol (Anthropic).

**Built-in MCP Servers**:

#### Filesystem MCP Server
- Operations: read, write, delete, list, search
- Shared virtual filesystem accessible by all agents
- Permission system for access control
- Change tracking and versioning

#### Browser MCP Server
- Operations: navigate, click, type, screenshot
- Headless browser pool (Puppeteer/Playwright)
- Session management
- Resource cleanup

#### Memory MCP Server
- Operations: store, retrieve, search, delete
- Shared context and knowledge base
- Vector storage for semantic search
- TTL and eviction policies

**Extension Points**:
- Custom MCP servers via plugin interface
- Custom tool definitions
- External API integrations

---

### 3. Sandbox Layer

**Purpose**: Secure, isolated execution environments for agents.

**Deployment Options**:

#### Cloud: E2B Sandboxes
- Firecracker-based isolation (hardware-level)
- Fast startup (~100-500ms)
- Pay-as-you-go pricing
- Managed infrastructure

#### Local: Docker Containers
- Container-based isolation (kernel-level)
- Very fast startup (~10-50ms)
- Self-hosted, free
- Requires Docker installation

**Configuration**: Switchable via environment variable
```bash
SANDBOX_PROVIDER=e2b    # Cloud
SANDBOX_PROVIDER=docker # Local
```

**Extension Points**:
- Custom sandbox providers
- Custom security policies
- Resource limits configuration

---

### 4. Observability Layer

**Purpose**: Monitor, trace, and debug agent interactions.

**Primary Tool**: LangSmith
- Automatic tracing of agent actions
- Session replay and debugging
- Cost tracking for LLM calls
- Production monitoring

**Collected Data**:
- Agent messages and responses
- Tool invocations (filesystem, browser, etc.)
- LLM API calls
- Errors and exceptions
- Performance metrics

**Extension Points**:
- Custom metrics collectors
- Alternative observability backends
- Custom alerting rules

---

### 5. Communication Layer

**Purpose**: Real-time updates and REST API for admin dashboard.

**Components**:
- **Express REST API**: CRUD operations for agents, tasks, files
- **Socket.io Server**: Real-time event streaming to UI
- **Event Bus (Redis)**: Pub/sub for inter-service communication

**Events**:
- `agent.created`, `agent.started`, `agent.stopped`, `agent.deleted`
- `agent.message` (A2A messages between agents)
- `tool.invoked` (filesystem, browser, memory operations)
- `task.assigned`, `task.completed`, `task.failed`
- `system.error`

---

### 6. Admin Dashboard

**Purpose**: Web-based UI for monitoring and managing the agent village.

**Key Features**:
- **Agent Monitor**: Live list of agents, status, current activity
- **Event Stream**: Real-time timeline of all system events
- **File Explorer**: Browse and manage shared filesystem
- **Browser Viewer**: Watch browser sessions in real-time
- **Agent Controls**: Create, start, stop, configure agents
- **Task Manager**: Assign tasks, track progress

**Technology**: React, TailwindCSS, Socket.io-client

---

## Data Flow Examples

### Example 1: Agent-to-Agent Communication

```
1. Agent A decides to communicate with Agent B
   └─► Agent A calls A2A protocol method
       └─► A2A constructs message with Agent A's card
           └─► Message routed to Agent B via orchestrator
               └─► Agent B receives message, processes
                   └─► Agent B responds via A2A
                       └─► Response routed back to Agent A
                           └─► Event logged to observability
                               └─► Dashboard receives real-time update
```

### Example 2: Agent Accesses Filesystem

```
1. Agent A wants to read a file
   └─► Agent A invokes MCP Filesystem tool
       └─► MCP server validates permissions
           └─► File read from virtual filesystem
               └─► Content returned to Agent A
                   └─► Event logged: tool.invoked
                       └─► Dashboard shows file access in timeline
```

### Example 3: User Creates Agent via Dashboard

```
1. User clicks "Create Agent" in dashboard
   └─► Frontend sends POST /api/agents
       └─► Backend validates request
           └─► Orchestrator creates agent instance
               └─► Sandbox allocated (E2B or Docker)
                   └─► Agent initialized with LLM connection
                       └─► A2A Agent Card generated
                           └─► Event: agent.created
                               └─► Dashboard updates in real-time
```

---

## Extension & Plugin System

### Plugin Architecture

All major components support plugins via a consistent interface:

```typescript
interface Plugin {
  name: string;
  version: string;
  initialize(context: PluginContext): Promise<void>;
  shutdown(): Promise<void>;
}
```

### Extension Points

1. **Agent Types**: Custom agent implementations
2. **MCP Servers**: Custom tools and resources
3. **LLM Providers**: Swap OpenAI for Anthropic, local models, etc.
4. **Sandbox Providers**: Add custom isolation mechanisms
5. **Observability Backends**: Custom monitoring solutions
6. **Communication Protocols**: Extend beyond A2A

See [EXTENSIBILITY.md](./EXTENSIBILITY.md) for detailed plugin development guide.

---

## Configuration System

### Environment-based Configuration

```bash
# Core
NODE_ENV=development|production
PORT=3000

# LLM Provider (Swappable)
LLM_PROVIDER=openai|anthropic|local
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Sandbox Provider (Swappable)
SANDBOX_PROVIDER=e2b|docker
E2B_API_KEY=...

# Observability (Optional)
LANGSMITH_API_KEY=...
LANGSMITH_PROJECT=mosaic-dev

# Database
DATABASE_URL=postgresql://...

# Redis (Event Bus)
REDIS_URL=redis://localhost:6379
```

### Configuration Files

```
config/
├── default.json         # Base config
├── development.json     # Dev overrides
├── production.json      # Prod overrides
└── plugins/
    ├── agents.json      # Custom agent configs
    ├── mcp-servers.json # Custom MCP configs
    └── providers.json   # Provider configs
```

---

## Security Considerations

1. **Sandbox Isolation**: All agent code runs in isolated environments
2. **Permission System**: Agents have configurable access to resources
3. **API Authentication**: REST API secured with JWT tokens (future)
4. **Rate Limiting**: Prevent abuse of LLM and resource APIs
5. **Input Validation**: All user inputs sanitized and validated
6. **Secrets Management**: API keys stored securely (env vars, vault)

---

## Scalability & Performance

### Horizontal Scaling

- **Stateless backend**: Can run multiple instances behind load balancer
- **Redis event bus**: Enables cross-instance communication
- **Database connection pooling**: Efficient DB resource usage
- **Sandbox pooling**: Pre-warm sandboxes for faster agent startup

### Performance Targets (MVP)

- Agent creation: < 2 seconds
- Message latency (agent-to-agent): < 100ms
- Dashboard update latency: < 50ms
- Concurrent agents: 10-50 (MVP), 100+ (future)

---

## Technology Stack Summary

| Layer | Technology | Purpose | Swappable? |
|-------|-----------|---------|------------|
| Agent Orchestration | LangGraph.js | State management, workflows | ✅ Yes |
| Agent Communication | A2A Protocol | Agent-to-agent messaging | ✅ Yes |
| Tool Access | MCP Servers | Filesystem, browser, memory | ✅ Yes |
| Sandboxing | E2B / Docker | Isolated execution | ✅ Yes |
| LLM Provider | OpenAI / Anthropic | AI model access | ✅ Yes |
| Observability | LangSmith | Tracing, monitoring | ✅ Yes |
| Backend | Node.js + TypeScript | Server runtime | ⚠️ Partial |
| API | Express | REST endpoints | ✅ Yes |
| Real-time | Socket.io | WebSocket server | ✅ Yes |
| Event Bus | Redis | Pub/sub messaging | ✅ Yes |
| Database | PostgreSQL | Persistent storage | ✅ Yes |
| Frontend | React | Admin dashboard | ✅ Yes |
| Styling | TailwindCSS | UI styling | ✅ Yes |

---

## Development Phases

### Phase 1: Foundation (Current)
- Project structure setup
- Core interfaces and contracts
- Configuration system
- Documentation

### Phase 2: Core Services
- Agent orchestration (LangGraph.js)
- A2A protocol implementation
- Basic MCP servers (filesystem, memory)
- Sandbox integration (E2B + Docker)

### Phase 3: Admin Dashboard
- React application setup
- Real-time event stream
- Agent monitoring UI
- Basic controls

### Phase 4: Enhanced Capabilities
- Browser MCP server
- Task management system
- Advanced agent coordination
- Performance optimization

### Phase 5: Production Ready
- Security hardening
- Comprehensive testing
- Deployment automation
- Documentation completion

---

## References

- [A2A Protocol Specification](https://a2a-protocol.org/)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [LangGraph.js Documentation](https://js.langchain.com/docs/langgraph)
- [E2B Documentation](https://e2b.dev/docs)
- [LangSmith Documentation](https://docs.smith.langchain.com/)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on extending and contributing to Project Mosaic.

## License

GNU GPL-3.0 - See [LICENSE](./LICENSE) file for details.

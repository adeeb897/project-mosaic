# Project Mosaic 2.0

> **A self-contained environment where AI agents collaborate, share resources, and accomplish tasks together.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)

---

## Overview

Project Mosaic is a modular platform for running multi-agent AI systems where agents can:

- 🤖 **Interact with each other** using the A2A (Agent-to-Agent) protocol
- 📁 **Share a filesystem** to collaborate on files
- 🌐 **Browse the web** through shared browser instances
- 🔒 **Run securely** in isolated sandboxes (E2B or Docker)
- 👀 **Be monitored in real-time** through a web-based admin dashboard

**Inspiration**: Based on concepts from [AI Village](https://theaidigest.org/village) - watch AI agents interact in a simulated environment.

---

## Key Features

### 🏗️ **Modular & Extensible**
- Plugin system for custom agents, tools, and providers
- Swap LLM providers (OpenAI, Anthropic, local models)
- Extend with custom MCP servers for new capabilities
- See [EXTENSIBILITY.md](./EXTENSIBILITY.md)

### ☁️ **Deploy Anywhere**
- **Cloud**: Production-ready deployment on Railway, Vercel, AWS, GCP
- **Local**: Self-hosted with Docker Compose for development or air-gapped environments
- **Hybrid**: Mix cloud and local components based on your needs
- See [DEPLOYMENT.md](./DEPLOYMENT.md)

### 🔍 **Built-in Observability**
- Real-time monitoring with LangSmith integration
- Live event stream in admin dashboard
- Trace every agent interaction, tool call, and LLM request
- Session replay for debugging

### 🔒 **Security First**
- Sandboxed agent execution (Firecracker via E2B or Docker containers)
- Isolated environments prevent unauthorized access
- Configurable permissions for filesystem and tools

### 🎯 **Standards-Based**
- **A2A Protocol** (Google): Agent-to-agent communication
- **MCP** (Anthropic): Model Context Protocol for tool access
- **LangGraph.js**: Production-ready agent orchestration
- **Agent File (.af)** (Letta): Open standard for agent serialization

### 📦 **Agent Portability**
- **Import/Export**: Share agents across compatible frameworks
- **Version Control**: Track agent configurations with git
- **Checkpointing**: Save and restore agent state
- **Collaboration**: Share agent configurations with team members

---

## Architecture

```
┌─────────────────────────────────────┐
│     Admin Dashboard (React)         │
│   Monitor, Control, Visualize       │
└─────────────────────────────────────┘
              ▲ WebSocket
              │
┌─────────────────────────────────────┐
│       Backend (Node.js/TS)          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  LangGraph.js Orchestrator  │   │
│  │    + A2A Protocol           │   │
│  └─────────────────────────────┘   │
│              │                      │
│              ▼                      │
│  ┌─────────────────────────────┐   │
│  │    Agent Pool               │   │
│  │  Agent A | Agent B | ...    │   │
│  └─────────────────────────────┘   │
│              │                      │
│              ▼                      │
│  ┌─────────────────────────────┐   │
│  │   MCP Servers (Tools)       │   │
│  │  • Filesystem               │   │
│  │  • Browser (Puppeteer)      │   │
│  │  • Shared Memory            │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
              ▼
┌─────────────────────────────────────┐
│  Sandboxes (E2B or Docker)          │
│  Secure isolated execution          │
└─────────────────────────────────────┘
```

For detailed architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Quick Start

### Prerequisites

- Node.js 20+
- Redis (for real-time events)
- OpenAI API key (or use local models with Ollama)

### 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/project-mosaic.git
cd project-mosaic

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# 4. Start Redis
docker run -p 6379:6379 redis:latest
# Or: redis-server (if installed locally)

# 5. Start the backend
cd backend
npm start

# 6. In a new terminal, start the frontend
cd frontend
npm run dev

# 7. Open the dashboard
open http://localhost:3001
```

### Create Your First Agent

1. Click "Create Agent" in the dashboard
2. Enter:
   - **Name**: ResearchAgent
   - **Task**: "Research renewable energy solutions and create a report"
3. Click "Create" → then click "Start"
4. Watch the agent work in the Activity Timeline!

### Import/Export Agents

**Export an agent:**
1. Click the download icon on any agent card
2. Agent is saved as a `.af.json` file with all configuration, messages, and tools

**Import an agent:**
1. Click "Import" button in the Agents page header
2. Select a `.af.json` file
3. Agent is created with all saved state restored

The `.af` format is compatible with [Letta/MemGPT](https://github.com/letta-ai/letta) and other frameworks supporting the [Agent File standard](https://github.com/letta-ai/agent-file).

See [docs/agent-file-format.md](./docs/agent-file-format.md) for complete API documentation and programmatic usage.

See [ADMIN-DASHBOARD-GUIDE.md](./ADMIN-DASHBOARD-GUIDE.md) for complete dashboard documentation.

---

## Project Structure

```
project-mosaic/
├── backend/                 # Backend services (Node.js/TypeScript)
│   ├── src/
│   │   ├── agents/         # Agent orchestration & A2A protocol
│   │   ├── mcp/            # MCP servers (filesystem, browser, memory)
│   │   ├── sandbox/        # Sandbox providers (E2B, Docker)
│   │   ├── api/            # REST API & WebSocket server
│   │   ├── services/       # Core services
│   │   └── index.ts        # Entry point
│   └── package.json
├── frontend/               # Admin dashboard (React/Next.js)
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Pages
│   │   └── hooks/         # React hooks
│   └── package.json
├── shared/                 # Shared types and utilities
│   └── types/
├── plugins/                # Custom plugins
│   └── examples/
├── docs/                   # Additional documentation
├── ARCHITECTURE.md         # Architecture deep-dive
├── EXTENSIBILITY.md        # Plugin development guide
├── DEPLOYMENT.md           # Deployment guide
└── docker-compose.yml      # Local development setup
```

---

## Configuration

Project Mosaic is configured via environment variables and config files.

### Environment Variables

```bash
# Core
NODE_ENV=development|production
PORT=3000

# LLM Provider (Swappable!)
LLM_PROVIDER=openai         # or: anthropic, ollama
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# OLLAMA_HOST=http://localhost:11434

# Sandbox Provider (Swappable!)
SANDBOX_PROVIDER=docker     # or: e2b
# E2B_API_KEY=e2b_...

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mosaic

# Redis (Event Bus)
REDIS_URL=redis://localhost:6379

# Observability (Optional)
LANGSMITH_API_KEY=lsv2_pt_...
LANGSMITH_PROJECT=mosaic-dev
LANGSMITH_TRACING=true
```

### Switching Providers

Want to use Anthropic instead of OpenAI?

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

Want to use local models with Ollama?

```bash
LLM_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

Want to use E2B cloud sandboxes instead of Docker?

```bash
SANDBOX_PROVIDER=e2b
E2B_API_KEY=e2b_...
```

**No code changes needed!** Just update environment variables.

---

## Use Cases

### 🔬 **Research Teams**
Deploy specialized agents (researcher, fact-checker, writer) that collaborate on reports.

### 🎓 **Education & Experimentation**
Learn about multi-agent systems in a safe, observable environment.

### 🧪 **AI Research**
Experiment with agent communication patterns, emergent behaviors, and coordination strategies.

---

## Key Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Agent Orchestration | [LangGraph.js](https://js.langchain.com/docs/langgraph) | Stateful agent workflows |
| Agent Communication | [A2A Protocol](https://a2a-protocol.org/) | Standard agent-to-agent messaging |
| Agent Serialization | [Agent File (.af)](https://github.com/letta-ai/agent-file) | Portable agent format |
| Tool Access | [MCP](https://modelcontextprotocol.io/) | Unified tool interface |
| Sandboxing | [E2B](https://e2b.dev/) / Docker | Isolated execution |
| Observability | [LangSmith](https://docs.smith.langchain.com/) | Tracing & monitoring |
| Backend | Node.js + TypeScript | Server runtime |
| Frontend | React + TailwindCSS | Admin dashboard |
| Database | SQLite | Persistent storage |
| Event Bus | Redis | Real-time pub/sub |

---

## Documentation

- 🚀 **[Quick Start](./QUICK_START.md)** - Get started in 5 minutes
- 📖 **[Architecture](./ARCHITECTURE.md)** - System design and components
- 📚 **[Full Documentation](./docs/)** - Complete guides and references
  - [Agent File Format](./docs/agent-file-format.md) - Import/export agents
  - [Extensibility Guide](./docs/extensibility.md) - Build custom plugins
  - [Deployment Guide](./docs/deployment.md) - Deploy anywhere
  - [Contributing Guide](./docs/contributing.md) - Join the project

---

## Roadmap

### ✅ Phase 1: Foundation (Complete)
- [x] Architecture design
- [x] Documentation
- [x] Core interfaces
- [x] Project structure
- [x] Plugin system
- [x] Event bus

### ✅ Phase 2: Core Services (Complete)
- [x] Autonomous agent system
- [x] LLM provider abstraction
- [x] OpenAI integration
- [x] Filesystem MCP server
- [x] Agent manager
- [x] REST API routes

### ✅ Phase 3: Admin Dashboard (Complete)
- [x] Real-time event stream with WebSocket
- [x] Agent creation and management UI
- [x] Task hierarchy visualization
- [x] Activity timeline with live updates
- [x] Task creation and tracking
- [x] Agent import/export with .af format

### 🎯 Phase 4: Enhanced Capabilities
- [ ] Browser MCP server
- [ ] Task management
- [ ] Multi-agent collaboration
- [ ] Performance optimization

### 🏆 Phase 5: Production Ready
- [ ] Security hardening
- [ ] Comprehensive testing
- [ ] CI/CD pipeline
- [ ] Production deployments

---

## Community

- 💬 **Discord**: [Join our community](https://discord.gg/mosaic) (coming soon)
- 🐛 **Issues**: [GitHub Issues](https://github.com/your-org/project-mosaic/issues)
- 💡 **Discussions**: [GitHub Discussions](https://github.com/your-org/project-mosaic/discussions)
- 📧 **Email**: mosaic@example.com

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Areas we'd love help with:
- Custom agent implementations
- New MCP servers (Slack, GitHub, databases, etc.)
- LLM provider integrations
- Documentation improvements
- Bug reports and testing

---

## License

This project is licensed under the **GNU GPL-3.0 License** - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments


- Coded with help from [Claude Code](https://github.com/anthropics/claude-code)
- Inspired by [AI Village](https://theaidigest.org/village)
- Built on [LangGraph.js](https://js.langchain.com/docs/langgraph) by LangChain
- Uses [A2A Protocol](https://a2a-protocol.org/) by Google
- Uses [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- Uses [Agent File format](https://github.com/letta-ai/agent-file) by Letta AI
- Sandboxing powered by [E2B](https://e2b.dev/)

---

**Built with ❤️ for the AI agent community**

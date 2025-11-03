# Project Mosaic - File Structure

Clean, organized documentation and code structure.

## 📂 Root Directory

```
project-mosaic/
├── README.md              # Main project overview
├── ARCHITECTURE.md        # System design deep-dive
├── CONTRIBUTING.md        # Contribution guidelines
├── LICENSE                # GPL-3.0 license
│
├── .claude/               # Implementation notes (for developers/AI)
│   ├── FILE_STRUCTURE.md         # This file
│   └── IMPLEMENTATION_STATUS.md  # What's done, what's next
│
├── docs/                  # User-facing documentation
│   ├── README.md                 # Docs index
│   ├── quick-start.md            # 5-minute setup guide
│   ├── extensibility.md          # Plugin development
│   └── deployment.md             # Deployment guides
│
├── backend/               # Backend services (Node.js/TypeScript)
│   ├── src/
│   │   ├── core/         # Foundation (logger, event bus, plugins)
│   │   ├── agents/       # Autonomous agent system
│   │   ├── llm/          # LLM provider abstraction
│   │   ├── mcp/          # MCP servers (tools)
│   │   ├── api/          # REST API routes
│   │   └── index.ts      # Entry point
│   └── package.json
│
├── frontend/              # Admin dashboard (React)
│   ├── src/
│   └── package.json
│
├── shared/                # Shared TypeScript types
│   ├── types/
│   │   └── index.ts      # All type definitions
│   └── package.json
│
├── config/                # Configuration files
│   ├── default.json
│   └── production.json
│
├── .env.example           # Environment template
├── docker-compose.yml     # Local dev setup
├── package.json           # Monorepo root
└── tsconfig.json          # TypeScript config
```

---

## 📖 Documentation Organization

### Root-Level Docs (Important, frequently accessed)
- **README.md** - First thing people see, project overview
- **ARCHITECTURE.md** - How the system works
- **CONTRIBUTING.md** - How to contribute

### `.claude/` (Implementation notes)
For developers and AI assistants working on the codebase:
- Implementation status and progress
- Technical decisions
- Development notes

### `docs/` (User guides)
For users and developers learning to use Project Mosaic:
- Quick start guides
- How-to guides
- Deployment instructions
- Plugin development

---

## 🎯 Documentation By Audience

### For End Users (Non-technical)
1. [README.md](../README.md) - What is this?
2. [docs/quick-start.md](../docs/quick-start.md) - How do I use it?

### For Developers (Building apps)
1. [docs/quick-start.md](../docs/quick-start.md) - Setup
2. [ARCHITECTURE.md](../ARCHITECTURE.md) - How it works
3. [docs/extensibility.md](../docs/extensibility.md) - Build plugins
4. [docs/deployment.md](../docs/deployment.md) - Deploy

### For Contributors (Working on codebase)
1. [CONTRIBUTING.md](../CONTRIBUTING.md) - Guidelines
2. [.claude/IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) - Current state
3. [backend/src/](../backend/src/) - Source code

---

## 🗂️ Key Files Reference

### Configuration
- `.env.example` - Environment variable template
- `config/default.json` - Default configuration
- `docker-compose.yml` - Local development setup

### Code Entry Points
- `backend/src/index.ts` - Backend main entry
- `frontend/src/index.tsx` - Frontend entry (future)
- `shared/types/index.ts` - All TypeScript types

### Core Implementations
- `backend/src/agents/autonomous-agent.ts` - **KEY INNOVATION**
- `backend/src/core/event-bus.ts` - Event system
- `backend/src/llm/openai-provider.ts` - LLM integration
- `backend/src/mcp/filesystem-server.ts` - File operations

---

## ✅ What's Clean Now

- ✅ Root has only essential docs
- ✅ Implementation notes in `.claude/`
- ✅ User guides in `docs/`
- ✅ Clear separation of concerns
- ✅ Easy to navigate

---

## 🔄 When to Add New Docs

### Add to Root
- Only if it's **essential** and **frequently accessed**
- Examples: README, LICENSE, CONTRIBUTING

### Add to `.claude/`
- Implementation notes
- Technical decisions
- Development logs
- AI assistant context

### Add to `docs/`
- User-facing guides
- How-to articles
- API references
- Tutorials

---

## 📝 Naming Conventions

- Root docs: `UPPERCASE.md` (e.g., `README.md`, `ARCHITECTURE.md`)
- Docs folder: `lowercase-with-dashes.md` (e.g., `quick-start.md`)
- Internal: `lowercase-with-dashes.md` in `.claude/`

---

Last updated: 2025-10-29

# Project Mosaic Admin Dashboard

A user-friendly web interface for creating autonomous AI agents, assigning high-level tasks, and tracking their activity in real-time.

## Features

### 1. Agent Management
- **Create Agents**: Simple form with name and high-level task
- **Monitor Status**: See which agents are running, idle, or stopped
- **Start/Stop Control**: Full control over agent execution
- **Session Tracking**: Each agent has its own session for activity tracking

### 2. Task Management
- **Create Tasks**: Define individual or shared tasks
- **Task Statistics**: View completion rates, priorities, and status
- **Filter & Search**: Find tasks by status, priority, or assigned agent
- **Priority Levels**: Critical, High, Medium, Low

### 3. Activity Timeline
- **Live Feed**: Real-time updates of agent actions
- **User-Friendly**: Plain English descriptions of what agents are doing
- **Screenshots**: Visual proof of browser actions
- **Filtering**: View all events, tasks only, tool usage, or errors

### 4. Task Tree Visualization
- **Hierarchy View**: See how complex tasks break down into sub-tasks
- **Interactive**: Expand/collapse nodes to explore the tree
- **Status Indicators**: Visual feedback for each task's status
- **Strategy Display**: View the reasoning behind task decomposition

## Getting Started

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Redis** (for real-time events)
3. **OpenAI API Key** (or other LLM provider)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/project-mosaic.git
cd project-mosaic

# Install dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Configuration

1. **Backend Environment** (`.env` in `backend/`):

```bash
NODE_ENV=development
PORT=3000

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Optional: Other LLM providers
# ANTHROPIC_API_KEY=...
# OLLAMA_HOST=http://localhost:11434
```

2. **Frontend Environment** (`.env.local` in `frontend/`):

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Running the Dashboard

**Step 1: Start Redis**

```bash
# Using Docker
docker run -p 6379:6379 redis:latest

# Or if Redis is installed locally
redis-server
```

**Step 2: Start the Backend**

```bash
cd backend
npm run dev
```

The API server will start on `http://localhost:3000`

**Step 3: Start the Frontend**

```bash
cd frontend
npm run dev
```

The dashboard will open on `http://localhost:3001`

## User Guide

### Creating Your First Agent

1. Click the **"Create Agent"** button in the Agents tab
2. Enter an agent name (e.g., "ResearchAgent")
3. Describe your task in plain English:
   - ✅ Good: "Research renewable energy solutions and create a comprehensive report"
   - ✅ Good: "Find the top 5 climate change initiatives and summarize their impact"
   - ❌ Too technical: "Call the API endpoint and parse JSON"

4. Click **"Create"**
5. The agent will appear in your list with status "idle"
6. Click the **Play** button to start the agent

### Monitoring Agent Progress

**Activity Timeline Tab:**
- Switch to the "Activity" tab
- You'll see a live feed of everything the agent is doing:
  - 🎯 Task milestones
  - 🛠️ Tool usage (file operations, web browsing, etc.)
  - 🌐 Browser navigation
  - ✅ Completed tasks
  - ⚠️ Errors and recovery attempts

**Example Timeline:**
```
🎯 [10:30:15] Started working on: Research renewable energy...
   Task: Research renewable energy solutions

🛠️ [10:30:18] Used filesystem.write_file: Creating research plan
   Status: completed

🌐 [10:30:25] Navigated to: wikipedia.org/Renewable_energy
   Status: completed

📸 Screenshot captured
   [Preview image shown]

✅ [10:31:02] Completed: Gather background information
   Task: Research current technologies
```

### Understanding Task Hierarchies

**Task Tree Tab:**
- Shows how complex tasks are broken down
- Each node represents a task or sub-task
- Colors indicate priority (red = critical, yellow = medium)
- Icons show status (✅ = done, ⏳ = in progress)

**Example Tree:**
```
✅ Research renewable energy solutions [completed]
   Strategy: Break into research, analysis, and writing phases
   ├── ⏳ Research current technologies [in_progress]
   │   ├── ✅ Search for solar energy information [completed]
   │   ├── ✅ Search for wind energy information [completed]
   │   └── ⏸️  Search for hydroelectric information [pending]
   ├── ⏸️  Analyze market trends [pending]
   │   ├── ⏸️  Find adoption rates [pending]
   │   └── ⏸️  Gather cost data [pending]
   └── ⏸️  Write comprehensive report [pending]
```

### Creating Shared Tasks

1. Go to the **"Tasks"** tab
2. Click **"Create Task"**
3. Fill in:
   - **Title**: What needs to be accomplished
   - **Description**: More details
   - **Priority**: How urgent is this?

4. The task will be visible to all agents
5. You can later assign it to a specific agent

## Architecture

### Backend Components

```
backend/
├── src/
│   ├── api/
│   │   ├── server.ts              # Express + Socket.IO server
│   │   └── routes/
│   │       ├── agent.routes.ts    # Agent CRUD + control
│   │       ├── task.routes.ts     # Task management
│   │       └── session.routes.ts  # History & timeline
│   ├── agents/
│   │   └── task-oriented-agent.ts # Autonomous agent
│   └── services/
│       ├── task-manager.service.ts    # Task hierarchy
│       └── session-manager.service.ts # Action recording
```

### Frontend Components

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx        # Main dashboard
│   │   └── layout.tsx      # App layout
│   ├── components/
│   │   ├── AgentManager.tsx    # Create & manage agents
│   │   ├── TaskManager.tsx     # Create & view tasks
│   │   ├── ActivityTimeline.tsx # Live activity feed
│   │   └── TaskTree.tsx        # Hierarchy visualization
│   └── hooks/
│       └── useWebSocket.ts # Real-time event updates
```

### Real-Time Communication

The dashboard uses **WebSocket** (Socket.IO) for live updates:

**Events Streamed:**
- `task:created`, `task:updated` - Task changes
- `agent:started`, `agent:stopped`, `agent:progress` - Agent lifecycle
- `action:recorded`, `action:completed` - Every action taken
- `screenshot:captured` - Browser screenshots

## API Documentation

### Agent Endpoints

```bash
# List all agents
GET /api/agents

# Create agent
POST /api/agents
Body: { name, rootTask, sessionId?, maxDepth? }

# Get agent details
GET /api/agents/:id

# Start agent
POST /api/agents/:id/start

# Stop agent
POST /api/agents/:id/stop

# Delete agent
DELETE /api/agents/:id
```

### Task Endpoints

```bash
# Query tasks
GET /api/tasks?status=in_progress&priority=high

# Create task
POST /api/tasks
Body: { title, description, priority, createdBy }

# Get task tree
GET /api/tasks/:id/tree

# Update task
PATCH /api/tasks/:id
Body: { status?, assignedTo?, result? }

# Decompose task
POST /api/tasks/:id/decompose
Body: { reasoning, subTasks[] }
```

### Session Endpoints

```bash
# Get session timeline
GET /api/sessions/:id/timeline?limit=100

# Query actions
GET /api/sessions/:id/actions?agentId=...&type=tool_invoked

# Export session
GET /api/sessions/:id/export
```

## Troubleshooting

### Backend Issues

**"Event bus not connected"**
- Ensure Redis is running: `docker ps` or `redis-cli ping`
- Check `REDIS_URL` in `.env`

**"OpenAI API key error"**
- Verify `OPENAI_API_KEY` is set correctly
- Check API key has credits: https://platform.openai.com/usage

**"Port 3000 already in use"**
- Change `PORT=3001` in `.env`
- Or stop other service: `npx kill-port 3000`

### Frontend Issues

**"Cannot connect to backend"**
- Ensure backend is running on port 3000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Look for CORS errors in browser console

**"WebSocket disconnected"**
- Check Redis connection
- Ensure backend is running
- Look for errors in backend logs

**"Components not rendering"**
- Run `npm install` in frontend directory
- Clear `.next` cache: `npm run clean`
- Check browser console for errors

## Best Practices

### For Non-Technical Users

1. **Be Specific**: Instead of "research climate change", try "research the top 5 climate change solutions being implemented in 2024"

2. **Start Simple**: Create an agent with a simple task first to understand the system

3. **Monitor Progress**: Keep the Activity Timeline open to see what your agents are doing

4. **Use Priorities**: Mark urgent tasks as "high" or "critical"

### For Developers

1. **Custom Agents**: Create specialized agents by extending `TaskOrientedAgent`

2. **Custom Tools**: Add new MCP servers to provide more capabilities

3. **Event Handling**: Subscribe to specific events for custom integrations

4. **Database**: For production, add PostgreSQL persistence

## Next Steps

- **Add More Tools**: Browser automation, API calls, data analysis
- **Multi-Agent Coordination**: Agents working together on shared tasks
- **Cost Tracking**: Monitor LLM usage and costs
- **Notifications**: Email/Slack alerts for task completion
- **Analytics**: Performance metrics and insights

## Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/project-mosaic/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/project-mosaic/discussions)

## License

MIT License - see [LICENSE](./LICENSE) for details

# Project Mosaic - Quick Start Guide

Get your autonomous agent platform running in **5 minutes**!

## Prerequisites

- Node.js 20+
- Redis (or Docker to run it)
- OpenAI API key

## Step-by-Step Setup

### 1. Get the Code

```bash
git clone https://github.com/your-org/project-mosaic.git
cd project-mosaic
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install
```

### 3. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your OpenAI API key:
# OPENAI_API_KEY=sk-proj-...
```

Your `.env` should look like:
```bash
NODE_ENV=development
PORT=3000

# OpenAI
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
OPENAI_MODEL=gpt-4

# Redis
REDIS_URL=redis://localhost:6379
```

### 4. Start Redis

**Option A: Using Docker** (recommended)
```bash
docker run -d -p 6379:6379 --name mosaic-redis redis:latest
```

**Option B: Local Redis** (if installed)
```bash
redis-server
```

### 5. Start the Backend

```bash
cd backend
npm start
```

You should see:
```
✅ Project Mosaic Server is ready!

📊 Services:
   - REST API: http://localhost:3000/api
   - WebSocket: ws://localhost:3000
   - Health Check: http://localhost:3000/health

🎯 Ready to create autonomous agents!
```

### 6. Start the Frontend

Open a **new terminal** and run:

```bash
cd frontend
npm run dev
```

You should see:
```
▲ Next.js 14.0.4
- Local:        http://localhost:3001
```

### 7. Open the Dashboard

Open your browser to: **http://localhost:3001**

You should see the Project Mosaic Admin Dashboard!

## Create Your First Agent

### 1. Click "Create Agent"

In the Agents tab, click the blue "Create Agent" button.

### 2. Fill in the Form

- **Agent Name**: `ResearchAgent`
- **High-Level Task**: `Research renewable energy solutions and create a comprehensive report`

### 3. Create and Start

1. Click **"Create"**
2. You'll see the agent appear in the list with status "idle"
3. Click the **▶️ Play** button to start the agent

### 4. Watch It Work!

Switch to the **"Activity"** tab to see real-time updates:

```
🎯 [10:30:15] Started working on: Research renewable energy...
   Task: Research renewable energy solutions

🛠️ [10:30:18] Used filesystem.write_file: Creating research plan
   Status: completed

🌐 [10:30:25] Navigated to: wikipedia.org/Renewable_energy
   Status: completed

✅ [10:31:02] Completed: Gather background information
   Task: Research current technologies
```

### 5. View the Task Tree

Switch to the **"Task Tree"** tab to see how the agent broke down your high-level task:

```
✅ Research renewable energy solutions [completed]
   Strategy: Break into research, analysis, and writing phases
   ├── ⏳ Research current technologies [in_progress]
   │   ├── ✅ Search for solar energy information [completed]
   │   ├── ✅ Search for wind energy information [completed]
   │   └── ⏸️  Search for hydroelectric information [pending]
   ├── ⏸️  Analyze market trends and statistics [pending]
   │   ├── ⏸️  Find adoption rates [pending]
   │   └── ⏸️  Gather cost comparison data [pending]
   └── ⏸️  Write comprehensive report [pending]
```

## Example Tasks to Try

### Simple Tasks (Good for Testing)
```
Create a file called "hello.txt" with a greeting message
```

### Medium Complexity
```
Research the top 5 climate change solutions and summarize them in a document
```

### High Complexity
```
Create a comprehensive business plan for a renewable energy startup, including market research, competitive analysis, and financial projections
```

### Very Ambitious
```
Research current AI safety approaches, identify gaps, and propose new research directions
```

The agent will automatically:
- Decide if the task should be decomposed
- Break it into manageable sub-tasks
- Execute each step
- Self-correct if errors occur
- Report progress in plain English

## Troubleshooting

### "Cannot connect to backend"

**Check if backend is running:**
```bash
curl http://localhost:3000/health
```

Should return: `{"status":"ok","timestamp":"..."}`

**If not running:**
- Check terminal for errors
- Ensure port 3000 is not in use
- Verify `.env` has correct settings

### "WebSocket disconnected"

**Check Redis:**
```bash
docker ps | grep redis
```

**If not running:**
```bash
docker run -d -p 6379:6379 --name mosaic-redis redis:latest
```

### "OpenAI API error"

**Verify API key:**
- Check `.env` has `OPENAI_API_KEY=sk-proj-...`
- Ensure key is valid and has credits
- Check usage: https://platform.openai.com/usage

### Port Already in Use

**If port 3000 is taken:**
Edit `backend/.env`:
```bash
PORT=3001
```

**If port 3001 is taken:**
Edit `frontend/package.json`:
```json
"dev": "next dev -p 3002"
```

## Next Steps

### Explore the Dashboard

1. **Agents Tab**: Create, manage, and control agents
2. **Tasks Tab**: Create shared tasks and view statistics
3. **Activity Tab**: Monitor live agent actions
4. **Task Tree Tab**: Visualize task hierarchies

### Learn More

- **Full Documentation**: [ADMIN-DASHBOARD-GUIDE.md](./ADMIN-DASHBOARD-GUIDE.md)
- **Task System**: [.claude/GOAL-HIERARCHY-IMPLEMENTATION.md](.claude/GOAL-HIERARCHY-IMPLEMENTATION.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)

### Advanced Features

**Create Shared Tasks:**
1. Go to Tasks tab
2. Click "Create Task"
3. Any agent can work on it!

**Multiple Agents:**
- Create multiple agents with different specializations
- Assign them different tasks
- Watch them work in parallel

**Export Sessions:**
```bash
GET /api/sessions/:id/export
```

Download complete session history for analysis!

## Quick Commands Reference

```bash
# Backend
cd backend
npm start          # Start API server
npm run dev        # Start with auto-reload

# Frontend
cd frontend
npm run dev        # Start dev server
npm run build      # Build for production

# Redis
docker run -p 6379:6379 redis:latest  # Start Redis
docker stop mosaic-redis              # Stop Redis
docker start mosaic-redis             # Restart Redis
```

## Getting Help

- **Documentation**: See `docs/` folder
- **Issues**: https://github.com/your-org/project-mosaic/issues
- **Discussions**: https://github.com/your-org/project-mosaic/discussions

## What's Next?

You now have a fully functional autonomous agent platform! Try:

1. ✅ Create agents with increasingly complex tasks
2. ✅ Monitor how they decompose and execute tasks
3. ✅ View complete activity timelines
4. ✅ Explore task trees to understand agent reasoning

**Have fun building with autonomous agents! 🚀**

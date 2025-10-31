# Persistence System Documentation

## Overview

Project Mosaic now includes a comprehensive persistence layer that ensures all agent configurations, tasks, activity timelines, and agent memory are saved to disk. This allows the system to survive server restarts and crashes, with agents able to resume their work exactly where they left off.

## Architecture

### Database

- **Technology**: SQLite with WAL (Write-Ahead Logging) mode for better concurrency
- **Location**: `./data/mosaic.db`
- **Schema**: Automatically initialized on server startup

### Core Components

1. **DatabaseService** ([`backend/src/persistence/database.ts`](../backend/src/persistence/database.ts))
   - Manages SQLite connection
   - Initializes schema with all tables and indices
   - Provides singleton access pattern

2. **Repositories** ([`backend/src/persistence/repositories/`](../backend/src/persistence/repositories/))
   - `AgentRepository` - Agent configurations and state
   - `TaskRepository` - Task hierarchy and relationships
   - `SessionRepository` - Session metadata
   - `ActionRepository` - Immutable activity timeline
   - `MemoryRepository` - Agent memory entries (mutable)

3. **Services**
   - `TaskManager` - Uses TaskRepository for persistence
   - `SessionManager` - Uses SessionRepository and ActionRepository
   - `MemoryManager` - Uses MemoryRepository

## Database Schema

### Tables

#### `agents`
Stores agent configurations and current state.

```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  config TEXT NOT NULL,        -- JSON
  metadata TEXT,                -- JSON
  root_task TEXT,
  session_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
```

#### `tasks`
Stores the task hierarchy with parent-child relationships.

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  parent_task_id TEXT,
  child_task_ids TEXT,          -- JSON array
  created_by TEXT NOT NULL,
  assigned_to TEXT,
  agent_id TEXT,
  session_id TEXT,
  metadata TEXT,                -- JSON
  started_at INTEGER,
  completed_at INTEGER,
  deadline INTEGER,
  estimated_duration INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
)
```

#### `sessions`
Stores session metadata.

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  agent_ids TEXT NOT NULL,      -- JSON array
  task_ids TEXT NOT NULL,        -- JSON array
  metadata TEXT,                 -- JSON
  created_at INTEGER NOT NULL,
  ended_at INTEGER
)
```

#### `action_records`
**Immutable** timeline of all agent actions for user tracking.

```sql
CREATE TABLE action_records (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  task_id TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,         -- JSON
  screenshot_id TEXT,
  screenshot_url TEXT,
  timestamp INTEGER NOT NULL,
  duration INTEGER,
  cost_prompt_tokens INTEGER,
  cost_completion_tokens INTEGER,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
)
```

#### `screenshots`
Stores screenshot metadata and paths.

```sql
CREATE TABLE screenshots (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  action_id TEXT,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  format TEXT,
  size INTEGER,
  captured_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (action_id) REFERENCES action_records(id) ON DELETE SET NULL
)
```

#### `memory_entries`
**Mutable** agent memory for plans, thoughts, learnings, and context.

```sql
CREATE TABLE memory_entries (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,            -- plan, thought, learning, context, checkpoint, observation
  importance TEXT NOT NULL,      -- critical, high, medium, low
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,                 -- JSON
  tags TEXT,                     -- JSON array
  related_task_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (related_task_id) REFERENCES tasks(id) ON DELETE SET NULL
)
```

## Agent Memory System

### Timeline vs Memory

**Activity Timeline** (`action_records`):
- **Immutable** - Never edited, only appended to
- For **user tracking** - Shows what the agent did
- Records: tool calls, LLM interactions, errors, completions
- Visible in the Activity Timeline UI

**Agent Memory** (`memory_entries`):
- **Mutable** - Can be created, updated, deleted
- For **agent reasoning** - Helps agent persist thoughts/plans
- Types: plans, thoughts, learnings, context, checkpoints, observations
- Managed by the agent to improve decision-making

### Memory Types

1. **plan** - Strategic plans and decomposed task strategies
2. **thought** - Reasoning and decision-making notes
3. **learning** - Lessons learned, patterns discovered
4. **context** - Important context about tasks
5. **checkpoint** - State snapshots for recovery
6. **observation** - Key observations from actions

### Memory Importance Levels

- **critical** - Essential information for task completion
- **high** - Important but not critical
- **medium** - Useful context
- **low** - Minor observations

## API Endpoints

### Memory Endpoints

#### Get Agent Memory Snapshot
```http
GET /api/agents/:agentId/memory?sessionId=<sessionId>
```

Returns organized memory by type:
```json
{
  "success": true,
  "data": {
    "agentId": "...",
    "sessionId": "...",
    "currentTaskId": "...",
    "plans": [...],
    "thoughts": [...],
    "learnings": [...],
    "context": [...],
    "totalEntries": 42,
    "lastUpdated": "2025-10-30T12:00:00.000Z"
  }
}
```

#### Search Memories
```http
GET /api/agents/:agentId/memory/search?type=plan&importance=high&search=renewable&limit=10
```

Query parameters:
- `type` - Filter by memory type
- `importance` - Filter by importance
- `tags` - Comma-separated tags
- `search` - Text search in title/content
- `relatedTaskId` - Filter by related task
- `sessionId` - Filter by session
- `limit` - Max results
- `offset` - Pagination offset

#### Create Memory
```http
POST /api/agents/:agentId/memory?sessionId=<sessionId>

{
  "type": "plan",
  "importance": "high",
  "title": "Climate Research Strategy",
  "content": "1. Research current technologies...",
  "relatedTaskId": "task-123",
  "tags": ["research", "climate"],
  "metadata": { "step": 1 }
}
```

#### Update Memory
```http
PATCH /api/memory/:memoryId

{
  "title": "Updated title",
  "content": "Updated content",
  "importance": "critical"
}
```

#### Delete Memory
```http
DELETE /api/memory/:memoryId
```

#### Cleanup Expired Memories
```http
POST /api/memory/cleanup
```

## Agent Methods

Agents have built-in memory helper methods:

```typescript
// Save different types of memories
await agent.savePlan(title, content, relatedTaskId);
await agent.saveThought(title, content, importance);
await agent.saveLearning(title, content);
await agent.saveContext(title, content, tags);
await agent.saveCheckpoint(title, stateData);
await agent.saveObservation(title, content, tags);

// Query memories
const snapshot = await agent.getMemorySnapshot();
const results = await agent.searchMemories("renewable energy");
const recent = await agent.getRecentMemories(10);
const plans = await agent.getMemoriesByType('plan');
```

## Persistence Guarantees

### What is Persisted

✅ **Always Persisted:**
- Agent configurations
- Task hierarchy (tree structure)
- All tasks with status, priority, relationships
- Session metadata
- Complete activity timeline (every action)
- All memory entries
- Screenshots metadata

### Resume After Crash

When the server restarts:

1. **Database Reconnects**: SQLite database is opened
2. **Agents Can Be Retrieved**: Query `GET /api/agents` returns all agents
3. **Tasks Are Intact**: Full task tree is preserved
4. **Timeline Survives**: All past actions are queryable
5. **Memory Persists**: Agent memory entries remain available

### Agent Resume Process

To resume an agent after a crash:

```typescript
// 1. List all agents
const agents = await GET('/api/agents');

// 2. Find agent that was running
const agent = agents.find(a => a.status === 'running');

// 3. Get its memory snapshot
const memory = await GET(`/api/agents/${agent.id}/memory`);

// 4. Get latest checkpoint
const checkpoint = memory.checkpoints[0];

// 5. Resume from checkpoint
// (Agents will use this data to continue work)
```

## Backup and Recovery

### Manual Backup

```bash
# Backup the database
cp backend/data/mosaic.db backend/data/mosaic-backup-$(date +%Y%m%d).db
```

### Automated Backup (Coming Soon)

The system can create automatic backups:

```typescript
const database = getDatabase();
await database.backup('./backups/mosaic-backup.db');
```

## Performance Considerations

### Indices

The database includes indices for common queries:
- Tasks by agent_id, session_id, status, parent_task_id
- Actions by session_id, agent_id, timestamp
- Memory by agent_id, session_id, type, importance, related_task_id

### Query Optimization

- Use `limit` parameter to avoid large result sets
- Filter by `sessionId` when possible to narrow scope
- Memory queries use compound indices for fast lookups

### Cleanup

Memory entries can have `expiresAt` timestamps. Run cleanup periodically:

```http
POST /api/memory/cleanup
```

This removes expired temporary memories to keep the database lean.

## Migration Notes

If you have existing agents in memory, they will need to be recreated to be persisted. Future versions may include migration tools.

## Future Enhancements

- [ ] Automatic periodic backups
- [ ] Database compaction/vacuum
- [ ] Export/import functionality
- [ ] Migration tools for schema updates
- [ ] Memory importance auto-adjustment based on access patterns
- [ ] Vector embeddings for semantic memory search

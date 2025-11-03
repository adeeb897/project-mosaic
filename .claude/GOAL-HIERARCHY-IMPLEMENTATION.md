# Task Hierarchy and Session Management Implementation

## Overview

This document describes the implementation of two critical features for Project Mosaic:
1. **Task Hierarchy System** - Enables agents to break down extremely high-level tasks into manageable sub-tasks
2. **Session/History Management** - Records every action, decision, and visual state for complete transparency

## Key Features

### 1. Task Hierarchy System

Agents can now handle tasks at any level of complexity, from "Create a file" to "Address climate change".

**Core Capabilities:**
- Autonomous task decomposition (breaking down complex tasks into sub-tasks)
- Hierarchical task tracking (tree structure with parent/child relationships)
- Automatic parent task completion when all children complete
- Priority and status management
- Cross-agent task visibility (agents can see and work on shared tasks)

**Files Created:**
- `shared/types/task-hierarchy.ts` - Type definitions for tasks, decomposition, queries
- `backend/src/services/task/task-manager.service.ts` - Task management service

**Key Types:**
- `Task` - Represents a task at any level with status, priority, hierarchy info
- `TaskDecomposition` - Agent's plan for breaking down a task
- `TaskTree` - Hierarchical visualization structure
- `TaskQuery` - Flexible task querying

### 2. Session/History Management

Complete transparency for non-technical users to understand what agents are doing.

**Core Capabilities:**
- Record every action (tool invocations, LLM requests, decisions)
- Capture screenshots of browser activity
- Generate user-friendly timelines
- Track costs (token usage, API costs)
- Export sessions for debugging/sharing

**Files Created:**
- `shared/types/session-history.ts` - Type definitions for sessions, actions, screenshots
- `backend/src/services/session/session-manager.service.ts` - Session management service

**Key Types:**
- `Session` - Represents a continuous work period
- `ActionRecord` - Single recorded action with full context
- `Screenshot` - Browser screenshot with annotations
- `TimelineEntry` - User-friendly display format

### 3. Task-Oriented Agent

Enhanced autonomous agent that works with the task hierarchy.

**Files Created:**
- `backend/src/agents/task-oriented-agent.ts` - Advanced agent with task decomposition

**How It Works:**
1. Agent receives a high-level task (e.g., "Create a comprehensive research report on renewable energy")
2. Agent uses LLM to decide if task should be decomposed or executed directly
3. If complex, agent breaks it into 3-7 sub-tasks with specific priorities
4. Agent executes each sub-task recursively (up to max depth limit)
5. All actions are recorded in the session history
6. Parent tasks auto-complete when all children finish

**Example Task Decomposition:**

```
Root: "Create a comprehensive research report on renewable energy"
├── "Research current renewable energy technologies"
│   ├── "Search for solar energy information"
│   ├── "Search for wind energy information"
│   └── "Search for hydroelectric information"
├── "Analyze market trends and statistics"
│   ├── "Find renewable energy adoption rates"
│   └── "Gather cost comparison data"
├── "Write report structure"
│   ├── "Create introduction section"
│   ├── "Write technology overview"
│   ├── "Add market analysis"
│   └── "Write conclusion"
└── "Format and save final report"
```

## User Experience

### For Non-Technical Users

**Setting a Task:**
```typescript
// Simply provide a natural language task
const agent = new TaskOrientedAgent({
  name: 'MyAgent',
  rootTask: 'Research and summarize climate change solutions',
  // ... config
});

await agent.start(); // Agent figures out the rest!
```

**Monitoring Progress:**
- Real-time timeline shows what the agent is doing
- Each entry has a plain English summary
- Screenshots show visual proof of browser actions
- Task tree shows the overall strategy

**Timeline Example:**
```
🎯 [10:30:15] Started working on: Research climate change solutions
🛠️ [10:30:18] Used filesystem.write_file: Creating research plan
🌐 [10:30:25] Navigated to: wikipedia.org/Climate_change
📸 Screenshot captured
✅ [10:31:02] Completed: Gather background information
🎯 [10:31:05] Started working on: Find current solutions
...
```

## Integration with Existing Code

The system integrates cleanly with existing components:
- Uses EventBus for real-time updates
- Works with all MCP servers
- Compatible with any LLM provider
- Extends the existing Agent interface

## Current Status

### ✅ Completed:
- Task hierarchy type definitions
- Session/history type definitions
- TaskManager service implementation
- SessionManager service implementation
- TaskOrientedAgent implementation
- Demo script for task hierarchy

### ⏳ Needs TypeScript Fixes:
- Some imports need adjustment (Task, TaskDecomposition exports)
- Agent interface needs pause/resume/onMessage methods
- SystemEvent format needs id and source fields
- currentTask type should allow string

### 🔄 Next Steps:
1. Fix TypeScript compilation errors
2. Test task decomposition with real scenarios
3. Add browser screenshot capture (requires browser MCP server)
4. Build admin dashboard UI to visualize sessions
5. Add database persistence for tasks and sessions
6. Implement task dependencies (some tasks must complete before others)

## Example Use Cases

### 1. Simple Task
Task: "Create a file called hello.txt"
- No decomposition needed
- Executes directly with filesystem tools

### 2. Medium Complexity
Task: "Research renewable energy and create a report"
- Decomposes into: Research → Analyze → Write → Format
- Each sub-task executed sequentially
- Results combined in final report

### 3. High Complexity
Task: "Address climate change"
- Decomposes into: Research solutions → Identify stakeholders → Create action plan → Implement outreach
- Each sub-task further decomposes
- Multi-level hierarchy (up to maxDepth)
- Could involve multiple agents working on different sub-tasks

## Benefits

### For Users:
- **Simple**: Just describe what you want in plain English
- **Transparent**: See exactly what the agent is doing and why
- **Reliable**: Self-correcting and comprehensive action logging

### For Developers:
- **Extensible**: Easy to add new task types and decomposition strategies
- **Observable**: Full event streams for monitoring and debugging
- **Scalable**: Tasks can be distributed across multiple agents

### vs. E2B:
- E2B: Developer-focused, code execution sandbox
- Mosaic: User-focused, autonomous task accomplishment
- E2B: Low-level (run this code)
- Mosaic: High-level (achieve this outcome)

## Configuration

### Task-Oriented Agent Options:
- `maxDepth`: Maximum decomposition depth (default: 5)
- `sessionId`: Session to record actions in
- `taskManager`: Shared task manager for multi-agent scenarios
- `sessionManager`: Session manager for action recording

### Session Options:
- `recordScreenshots`: Enable/disable screenshot capture
- `screenshotInterval`: Frequency of automatic screenshots (ms)
- `maxHistorySize`: Limit number of action records

## API Examples

### Creating and Working on Tasks

```typescript
// Create root task
const rootTask = await taskManager.createTask({
  title: 'Build a web scraper for news articles',
  description: 'Scrape and analyze news from multiple sources',
  priority: 'high',
  createdBy: 'user123',
});

// Agent decomposes it
const decomposition: TaskDecomposition = {
  taskId: rootTask.id,
  reasoning: 'Need to break this into research, implementation, and testing phases',
  subTasks: [
    {
      title: 'Research news website structures',
      description: 'Analyze HTML structure of target sites',
      priority: 'high',
      estimatedSteps: 5,
    },
    {
      title: 'Implement scraping logic',
      description: 'Write code to extract articles',
      priority: 'high',
      estimatedSteps: 10,
    },
    {
      title: 'Test with real websites',
      description: 'Verify scraper works correctly',
      priority: 'medium',
      estimatedSteps: 3,
    },
  ],
};

await taskManager.decomposeTask(decomposition);
```

### Querying Tasks

```typescript
// Get all pending tasks for an agent
const pendingTasks = taskManager.queryTasks({
  status: 'pending',
  assignedTo: 'agent-123',
});

// Get all high-priority tasks
const urgentTasks = taskManager.queryTasks({
  priority: ['critical', 'high'],
});

// Get task tree for visualization
const tree = taskManager.getTaskTree(rootTaskId);
```

### Session Timeline

```typescript
// Get recent actions
const timeline = sessionManager.getTimeline(sessionId, 50);

// Export entire session
const exported = await sessionManager.exportSession(sessionId);
// Can be saved to file and imported later for analysis
```

## Future Enhancements

1. **Task Templates**: Pre-defined decomposition strategies for common tasks
2. **Multi-Agent Coordination**: Agents claim and work on different sub-tasks
3. **Task Dependencies**: DAG-based execution order
4. **Cost Estimation**: Predict time/cost before starting
5. **Interactive Approval**: User approves decomposition before execution
6. **Learning**: Agents learn better decomposition strategies over time

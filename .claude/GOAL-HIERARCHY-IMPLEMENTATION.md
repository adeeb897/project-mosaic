# Goal Hierarchy and Session Management Implementation

## Overview

This document describes the implementation of two critical features for Project Mosaic:
1. **Goal Hierarchy System** - Enables agents to break down extremely high-level goals into manageable sub-goals
2. **Session/History Management** - Records every action, decision, and visual state for complete transparency

## Key Features

### 1. Goal Hierarchy System

Agents can now handle goals at any level of complexity, from "Create a file" to "Address climate change".

**Core Capabilities:**
- Autonomous goal decomposition (breaking down complex goals into sub-goals)
- Hierarchical goal tracking (tree structure with parent/child relationships)
- Automatic parent goal completion when all children complete
- Priority and status management
- Cross-agent goal visibility (agents can see and work on shared goals)

**Files Created:**
- `shared/types/goal-hierarchy.ts` - Type definitions for goals, decomposition, queries
- `backend/src/services/goal/goal-manager.service.ts` - Goal management service

**Key Types:**
- `Goal` - Represents a goal at any level with status, priority, hierarchy info
- `GoalDecomposition` - Agent's plan for breaking down a goal
- `GoalTree` - Hierarchical visualization structure
- `GoalQuery` - Flexible goal querying

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

### 3. Goal-Oriented Agent

Enhanced autonomous agent that works with the goal hierarchy.

**Files Created:**
- `backend/src/agents/goal-oriented-agent.ts` - Advanced agent with goal decomposition

**How It Works:**
1. Agent receives a high-level goal (e.g., "Create a comprehensive research report on renewable energy")
2. Agent uses LLM to decide if goal should be decomposed or executed directly
3. If complex, agent breaks it into 3-7 sub-goals with specific priorities
4. Agent executes each sub-goal recursively (up to max depth limit)
5. All actions are recorded in the session history
6. Parent goals auto-complete when all children finish

**Example Goal Decomposition:**

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

**Setting a Goal:**
```typescript
// Simply provide a natural language goal
const agent = new GoalOrientedAgent({
  name: 'MyAgent',
  rootGoal: 'Research and summarize climate change solutions',
  // ... config
});

await agent.start(); // Agent figures out the rest!
```

**Monitoring Progress:**
- Real-time timeline shows what the agent is doing
- Each entry has a plain English summary
- Screenshots show visual proof of browser actions
- Goal tree shows the overall strategy

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
- Goal hierarchy type definitions
- Session/history type definitions
- GoalManager service implementation
- SessionManager service implementation
- GoalOrientedAgent implementation
- Demo script for goal hierarchy

### ⏳ Needs TypeScript Fixes:
- Some imports need adjustment (Goal, GoalDecomposition exports)
- Agent interface needs pause/resume/onMessage methods
- SystemEvent format needs id and source fields
- currentTask type should allow string

### 🔄 Next Steps:
1. Fix TypeScript compilation errors
2. Test goal decomposition with real scenarios
3. Add browser screenshot capture (requires browser MCP server)
4. Build admin dashboard UI to visualize sessions
5. Add database persistence for goals and sessions
6. Implement goal dependencies (some goals must complete before others)

## Example Use Cases

### 1. Simple Task
Goal: "Create a file called hello.txt"
- No decomposition needed
- Executes directly with filesystem tools

### 2. Medium Complexity
Goal: "Research renewable energy and create a report"
- Decomposes into: Research → Analyze → Write → Format
- Each sub-goal executed sequentially
- Results combined in final report

### 3. High Complexity
Goal: "Address climate change"
- Decomposes into: Research solutions → Identify stakeholders → Create action plan → Implement outreach
- Each sub-goal further decomposes
- Multi-level hierarchy (up to maxDepth)
- Could involve multiple agents working on different sub-goals

## Benefits

### For Users:
- **Simple**: Just describe what you want in plain English
- **Transparent**: See exactly what the agent is doing and why
- **Reliable**: Self-correcting and comprehensive action logging

### For Developers:
- **Extensible**: Easy to add new goal types and decomposition strategies
- **Observable**: Full event streams for monitoring and debugging
- **Scalable**: Goals can be distributed across multiple agents

### vs. E2B:
- E2B: Developer-focused, code execution sandbox
- Mosaic: User-focused, autonomous goal accomplishment
- E2B: Low-level (run this code)
- Mosaic: High-level (achieve this outcome)

## Configuration

### Goal-Oriented Agent Options:
- `maxDepth`: Maximum decomposition depth (default: 5)
- `sessionId`: Session to record actions in
- `goalManager`: Shared goal manager for multi-agent scenarios
- `sessionManager`: Session manager for action recording

### Session Options:
- `recordScreenshots`: Enable/disable screenshot capture
- `screenshotInterval`: Frequency of automatic screenshots (ms)
- `maxHistorySize`: Limit number of action records

## API Examples

### Creating and Working on Goals

```typescript
// Create root goal
const rootGoal = await goalManager.createGoal({
  title: 'Build a web scraper for news articles',
  description: 'Scrape and analyze news from multiple sources',
  priority: 'high',
  createdBy: 'user123',
});

// Agent decomposes it
const decomposition: GoalDecomposition = {
  goalId: rootGoal.id,
  reasoning: 'Need to break this into research, implementation, and testing phases',
  subGoals: [
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

await goalManager.decomposeGoal(decomposition);
```

### Querying Goals

```typescript
// Get all pending goals for an agent
const pendingGoals = goalManager.queryGoals({
  status: 'pending',
  assignedTo: 'agent-123',
});

// Get all high-priority goals
const urgentGoals = goalManager.queryGoals({
  priority: ['critical', 'high'],
});

// Get goal tree for visualization
const tree = goalManager.getGoalTree(rootGoalId);
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

1. **Goal Templates**: Pre-defined decomposition strategies for common goals
2. **Multi-Agent Coordination**: Agents claim and work on different sub-goals
3. **Goal Dependencies**: DAG-based execution order
4. **Cost Estimation**: Predict time/cost before starting
5. **Interactive Approval**: User approves decomposition before execution
6. **Learning**: Agents learn better decomposition strategies over time

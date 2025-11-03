# LangGraph + E2B Migration

## Overview

We've migrated from a custom-built agent orchestration system to **LangGraph** with **E2B** sandboxing, dramatically simplifying the codebase and aligning with industry standards.

## What Changed

### Deleted

- ❌ **`backend/src/agents/task-oriented-agent.ts`** (1200+ lines) - Custom agent implementation with:
  - Manual execution loops
  - Custom prompt engineering
  - Tool calling logic
  - State management
  - Error handling for blocking/loops

### Added

- ✅ **`backend/src/agents/langgraph-agent.ts`** (~300 lines) - LangGraph-based agent
- ✅ **`backend/src/agents/utils/mcp-to-langchain.ts`** - MCP → LangChain tool converter
- ✅ **E2B Code Interpreter** integration for safe Python execution

## Architecture

### Before
```
Custom Agent Loop (1200 lines)
├── Manual prompt engineering
├── Custom tool calling
├── Manual state management
├── Error-prone blocking detection
└── Hard to maintain
```

### After
```
LangGraph Agent (~300 lines)
├── Battle-tested orchestration (LangGraph)
├── Standard tool calling (LangChain)
├── Built-in state management (MemorySaver)
├── Human-in-the-loop support
├── E2B sandbox for code execution
└── Much easier to extend
```

## Key Benefits

1. **~75% Less Code** - From 1200+ lines to ~300 lines
2. **No More Looping Issues** - LangGraph handles this properly
3. **Safe Code Execution** - E2B provides isolated Python sandboxes
4. **Standard Tools** - Uses industry-standard LangChain tools
5. **Better Resumability** - Built-in checkpointing
6. **Easier to Debug** - Can enable LangSmith tracing
7. **Community Support** - LangGraph has extensive docs/examples

## How It Works

### Agent Creation

**Frontend (AgentManager.tsx):**
```typescript
const payload = {
  name: "MyAgent",
  llmProvider: "anthropic-provider",
  model: "claude-sonnet-4-5-20250929",
  mcpServerNames: ["browser-server", "filesystem-server"],
  useE2B: true, // Enable E2B sandbox
};
```

**Backend creates LangGraph agent:**
```typescript
const agent = new LangGraphAgent({
  name,
  llmProvider,
  model,
  mcpServers: selectedMcpServers,
  eventBus,
  taskManager,
  sessionManager,
  memoryManager,
  useE2B: true,
});

await agent.initialize(); // Sets up LangGraph + E2B
```

### Tool Integration

**MCP servers → LangChain tools:**
```typescript
// Convert MCP tools
const mcpTools = convertMCPToLangChainTools(mcpServers);

// Add E2B code interpreter
const e2bTool = new DynamicStructuredTool({
  name: 'execute_python',
  description: 'Execute Python code in secure sandbox',
  schema: z.object({ code: z.string() }),
  func: async ({ code }) => {
    const result = await e2bSandbox.notebook.execCell(code);
    return result.text;
  }
});

// LangGraph uses all tools
const agent = createReactAgent({
  llm: new ChatAnthropic({ model }),
  tools: [...mcpTools, e2bTool],
  checkpointSaver: new MemorySaver(),
});
```

### Task Execution

**Simple invocation - LangGraph handles everything:**
```typescript
await agent.invoke({
  messages: [
    new SystemMessage("You are an AI assistant"),
    new HumanMessage(task.description)
  ]
}, {
  configurable: { thread_id: task.id }
});
```

LangGraph automatically:
- Loops until task complete
- Calls tools as needed
- Manages state
- Handles errors
- Supports interruptions

## E2B Integration

### What is E2B?

E2B provides **secure, isolated cloud sandboxes** for code execution. Each agent gets its own sandbox with:
- Python interpreter
- File system
- Isolated environment
- Automatic cleanup

### Usage Example

Agent can now safely:
```python
# Analyze data
import pandas as pd
df = pd.read_csv('data.csv')
print(df.describe())

# Create visualizations
import matplotlib.pyplot as plt
plt.plot(data)
plt.savefig('chart.png')

# Process files
with open('report.txt', 'w') as f:
    f.write(analysis)
```

All in a **secure sandbox** - no risk to host system!

### Configuration

Add to `.env`:
```bash
# Enable E2B
E2B_API_KEY=e2b_your_api_key_here
```

Get your API key at [e2b.dev](https://e2b.dev)

## Migration Impact

### For Users
- ✅ **Better reliability** - No more infinite loops
- ✅ **Safer execution** - Code runs in sandboxes
- ✅ **Same UI** - No changes to frontend workflow
- ✅ **Same API** - Existing integrations work

### For Developers
- ✅ **Less code to maintain** - 75% reduction
- ✅ **Easier to extend** - Add tools via LangChain
- ✅ **Better debugging** - LangSmith integration
- ✅ **Standard patterns** - Follow LangGraph docs

## Files Changed

### Backend
- ❌ Deleted: `backend/src/agents/task-oriented-agent.ts`
- ✅ Added: `backend/src/agents/langgraph-agent.ts`
- ✅ Added: `backend/src/agents/utils/mcp-to-langchain.ts`
- ✏️  Modified: `backend/src/api/routes/agent.routes.ts`
- ✏️  Modified: `backend/package.json` (added `@e2b/code-interpreter`)

### Frontend
- ✏️  Modified: `frontend/src/components/AgentManager.tsx` (added E2B checkbox)

### Config
- ✏️  `.env.example` already had E2B config

## Testing

1. **Create an agent with E2B enabled**
2. **Give it a task requiring code:** "Analyze this CSV file with pandas"
3. **Agent will:**
   - Use E2B sandbox
   - Execute Python code safely
   - Return results
   - Clean up automatically

## Troubleshooting

### E2B not available
If E2B_API_KEY is not set, agent will:
- Log warning
- Continue without E2B
- Still work with MCP tools

### Agent still using old code?
- Restart backend server
- Check no `task-oriented-agent.ts` exists
- Verify `langgraph-agent.ts` is imported

### Build fails?
Try:
```bash
cd backend
rm -rf node_modules dist
npm install
npm run build
```

## Next Steps

1. **Optional: Enable LangSmith tracing**
   ```bash
   LANGSMITH_API_KEY=your_key
   LANGSMITH_PROJECT=mosaic
   LANGSMITH_TRACING=true
   ```

2. **Optional: Add more tools**
   - Create new MCP servers
   - They automatically convert to LangChain tools
   - Agent can use them immediately

3. **Optional: Customize agent behavior**
   - Modify LangGraph prompts
   - Add custom nodes to graph
   - See [LangGraph docs](https://js.langchain.com/docs/langgraph)

## Resources

- [LangGraph Docs](https://js.langchain.com/docs/langgraph)
- [E2B Docs](https://e2b.dev/docs)
- [LangChain Tools](https://js.langchain.com/docs/integrations/tools)
- [MCP Protocol](https://modelcontextprotocol.io/)

---

**Built with ❤️ using LangGraph and E2B**

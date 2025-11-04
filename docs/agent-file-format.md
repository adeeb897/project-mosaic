# Agent File (.af) Format Support

Project Mosaic now supports the [Agent File (.af) format](https://github.com/letta-ai/agent-file), an open standard for serializing stateful AI agents with persistent memory and behavior.

## Overview

The Agent File format enables:
- **Portability**: Transfer agents between compatible frameworks
- **Version Control**: Track agent evolution with git-friendly JSON
- **Checkpointing**: Save and restore agent state
- **Collaboration**: Share agent configurations with team members

## Supported Fields

Our implementation supports all core Agent File fields:

### Basic Metadata
- `name`: Agent name
- `agent_type`: Type of agent (e.g., "langgraph-agent")
- `description`: Human-readable description
- `version`: Agent version (semantic versioning)
- `created_at`: ISO 8601 timestamp
- `updated_at`: ISO 8601 timestamp

### Configuration
- `system`: System prompt defining agent behavior
- `llm_config`: LLM configuration
  - `model`: Model name (e.g., "gpt-4", "claude-3-opus")
  - `context_window`: Maximum context window size
  - `temperature`, `max_tokens`, etc.
- `embedding_config`: Optional embedding model configuration

### Memory & Context
- `core_memory`: In-context memory blocks for personality, user info, etc.
- `messages`: Complete chat history with role and content
  - Includes `in_context` field indicating if message is in current context window
- `in_context_message_indices`: Array of indices for messages in context
- `message_buffer_autoclear`: Auto-clear old messages when context fills

### Tools & Rules
- `tools`: Complete tool definitions including:
  - `name`, `description`
  - `json_schema`: Tool parameters and types
  - `source_code`: Optional implementation code
- `tool_rules`: Constraints on tool sequencing and execution
- `tool_exec_environment_variables`: Environment variables for tools

### Organization
- `tags`: Array of tags for categorization
- `metadata_`: Additional metadata (includes Mosaic-specific fields)
- `multi_agent_group`: Optional multi-agent coordination config

## API Endpoints

### Export Agent

**GET** `/api/agents/:id/export`

Export an agent as Agent File format (JSON response).

**Query Parameters:**
- `includeMessages` (boolean, default: true): Include message history
- `includeTools` (boolean, default: true): Include tool definitions
- `includeMemory` (boolean, default: true): Include memory blocks
- `messageLimit` (number, optional): Limit number of messages to export
- `prettyPrint` (boolean, default: true): Pretty-print JSON

**Example:**
```bash
curl http://localhost:3001/api/agents/abc123/export?messageLimit=100
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metadata": {
      "schema_version": "1.0",
      "exported_at": "2025-11-04T20:00:00.000Z",
      "source_system": "project-mosaic"
    },
    "agent": {
      "name": "MyAgent",
      "agent_type": "langgraph-agent",
      "version": "1.0.0",
      "llm_config": {
        "model": "gpt-4",
        "context_window": 128000
      },
      "messages": [...],
      "tools": [...],
      ...
    }
  }
}
```

### Download Agent File

**GET** `/api/agents/:id/export/download`

Export and download agent as `.af.json` file.

**Query Parameters:** Same as export endpoint

**Example:**
```bash
curl -O -J http://localhost:3001/api/agents/abc123/export/download
```

Downloads: `MyAgent_1730750400000.af.json`

### Import Agent

**POST** `/api/agents/import`

Import an agent from Agent File format.

**Query Parameters:**
- `preserveId` (boolean, default: false): Keep original agent ID
- `overwriteExisting` (boolean, default: false): Overwrite if ID exists
- `mergeMessages` (boolean, default: false): Merge with existing messages
- `mergeTools` (boolean, default: false): Merge with existing tools
- `conflictResolution` (string, default: "create_new"): How to handle conflicts
  - `"create_new"`: Create new agent with new ID
  - `"replace"`: Replace existing agent
  - `"skip"`: Skip import if exists

**Example:**
```bash
curl -X POST http://localhost:3001/api/agents/import \
  -H "Content-Type: application/json" \
  -d @agent.af.json
```

**Request Body:** Complete Agent File JSON

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "def456",
    "name": "MyAgent",
    "type": "langgraph-agent",
    "status": "idle",
    "message": "Agent imported successfully"
  }
}
```

## Database Schema

All Agent File fields are stored in the `agents` table:

```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,

  -- Legacy fields
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  config TEXT NOT NULL,
  root_task TEXT,
  session_id TEXT,

  -- Agent File (.af) format fields
  agent_type TEXT,
  description TEXT,
  version TEXT,
  system TEXT,
  llm_config TEXT NOT NULL,
  embedding_config TEXT,
  core_memory TEXT NOT NULL DEFAULT '[]',
  messages TEXT NOT NULL DEFAULT '[]',
  in_context_message_indices TEXT,
  message_buffer_autoclear INTEGER DEFAULT 0,
  tools TEXT NOT NULL DEFAULT '[]',
  tool_rules TEXT,
  tool_exec_environment_variables TEXT,
  tags TEXT,
  metadata_ TEXT,
  multi_agent_group TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
```

## Programmatic Usage

### AgentFileService

The `AgentFileService` provides programmatic access to import/export:

```typescript
import { AgentFileService } from './services/agent-file.service';
import { AgentRepository } from './persistence/repositories/agent.repository';

const service = new AgentFileService();
const repo = new AgentRepository(db);

// Export agent
const agent = repo.findById('agent-id');
const agentFile = service.exportToAgentFile(agent, {
  includeMessages: true,
  messageLimit: 100,
});

// Export to JSON string
const json = service.exportToJson(agent, {
  prettyPrint: true,
});

// Import from JSON
const imported = service.importFromJson(json, {
  preserveId: false,
  conflictResolution: 'create_new',
});

// Validate agent file
service.validateAgentFile(agentFileWrapper);

// Merge messages
const merged = service.mergeMessages(
  existingMessages,
  importedMessages
);
```

## Database Initialization

The database schema includes all Agent File fields from the start. When creating a new agent:
- `agent_type` is set from the agent type
- `llm_config` is populated from the LLM provider configuration
- Empty arrays are initialized for `core_memory`, `messages`, `tools`
- All fields can be populated via import from .af files

## Limitations & Future Work

**Current Limitations:**
- Message history not automatically captured from LangGraph's internal state
- System prompts not yet integrated with LangGraph agent initialization
- Passages (Archival Memory) not supported (per .af spec, planned for future)

**Planned Enhancements:**
- Periodic extraction of messages from LangGraph checkpointer
- System prompt injection into agent initialization
- Message history restoration on agent load
- Archival memory support when added to .af spec

## Compatibility

- **Schema Version**: 1.0 (compatible with .af spec)
- **Supported Versions**: 1.0, 0.9
- **Format**: JSON (UTF-8)
- **File Extension**: `.af.json`

## Examples

See `/examples/agent-files/` for sample agent files:
- `minimal-agent.af.json`: Minimal required fields
- `full-agent.af.json`: Complete agent with all fields
- `letta-import.af.json`: Agent exported from Letta/MemGPT

## Related Resources

- [Agent File Specification](https://github.com/letta-ai/agent-file)
- [Letta/MemGPT](https://github.com/letta-ai/letta)
- [Agent File Schema](https://github.com/letta-ai/letta/blob/main/letta/serialize_schemas/pydantic_agent_schema.py)

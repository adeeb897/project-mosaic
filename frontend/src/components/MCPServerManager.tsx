/**
 * MCP Server Manager Component
 * Allows users to add, edit, and remove custom MCP servers from an agent
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MCPServerConfig } from '@mosaic/shared';

interface MCPServerManagerProps {
  agentId: string;
  onUpdate?: () => void;
}

interface MCPServerListResponse {
  builtin: Array<{ name: string; type: 'builtin'; description?: string }>;
  custom: MCPServerConfig[];
  all: Array<any>;
}

const EXAMPLE_SERVERS = [
  {
    name: 'Slack',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    envVars: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
    description: 'Integrate with Slack to read/send messages, manage channels',
  },
  {
    name: 'GitHub',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    envVars: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
    description: 'Integrate with GitHub to manage repositories, issues, PRs',
  },
  {
    name: 'Google Maps',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-google-maps'],
    envVars: ['GOOGLE_MAPS_API_KEY'],
    description: 'Access Google Maps API for geocoding, directions, places',
  },
  {
    name: 'Postgres',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    envVars: ['POSTGRES_CONNECTION_STRING'],
    description: 'Connect to PostgreSQL databases to run queries',
  },
  {
    name: 'SQLite',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite'],
    envVars: [],
    argParams: ['path/to/database.db'],
    description: 'Connect to SQLite databases (provide path as argument)',
  },
];

export const MCPServerManager: React.FC<MCPServerManagerProps> = ({ agentId, onUpdate }) => {
  const [servers, setServers] = useState<MCPServerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    command: 'npx',
    args: [] as string[],
    argsText: '',
    env: {} as Record<string, string>,
    envText: '',
  });

  const fetchServers = async () => {
    try {
      setLoading(true);
      const response = await axios.get<{ success: boolean; data: MCPServerListResponse }>(
        `${import.meta.env.VITE_API_URL}/api/agents/${agentId}/mcp-servers`
      );
      if (response.data.success) {
        setServers(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch MCP servers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, [agentId]);

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Parse args from text
      const args = formData.argsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Parse env from text
      const env: Record<string, string> = {};
      formData.envText.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key) {
            env[key.trim()] = valueParts.join('=').trim();
          }
        }
      });

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/agents/${agentId}/mcp-servers`,
        {
          name: formData.name,
          description: formData.description,
          command: formData.command,
          args,
          env,
        }
      );

      if (response.data.success) {
        alert(`Successfully added MCP server "${formData.name}"`);
        setShowAddForm(false);
        setFormData({
          name: '',
          description: '',
          command: 'npx',
          args: [],
          argsText: '',
          env: {},
          envText: '',
        });
        fetchServers();
        onUpdate?.();
      }
    } catch (error: any) {
      alert(
        `Failed to add MCP server: ${error.response?.data?.error || error.message}`
      );
    }
  };

  const handleRemoveServer = async (serverName: string) => {
    if (!confirm(`Are you sure you want to remove the "${serverName}" MCP server?`)) {
      return;
    }

    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/agents/${agentId}/mcp-servers/${serverName}`
      );

      if (response.data.success) {
        alert(`Successfully removed MCP server "${serverName}"`);
        fetchServers();
        onUpdate?.();
      }
    } catch (error: any) {
      alert(
        `Failed to remove MCP server: ${error.response?.data?.error || error.message}`
      );
    }
  };

  const loadExample = (example: typeof EXAMPLE_SERVERS[0]) => {
    setFormData({
      name: '',
      description: example.description,
      command: example.command,
      args: [],
      argsText: example.args.join('\n'),
      env: {},
      envText: example.envVars.map(key => `${key}=`).join('\n'),
    });
  };

  if (loading) {
    return <div>Loading MCP servers...</div>;
  }

  return (
    <div className="mcp-server-manager">
      <h3>MCP Servers</h3>
      <p className="text-sm text-gray-600 mb-4">
        MCP (Model Context Protocol) servers provide additional tools and integrations for your agent.
      </p>

      {/* Built-in Servers */}
      {servers && servers.builtin.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Built-in Servers</h4>
          <div className="space-y-2">
            {servers.builtin.map((server) => (
              <div
                key={server.name}
                className="p-3 bg-gray-50 border border-gray-200 rounded"
              >
                <div className="font-medium">{server.name}</div>
                {server.description && (
                  <div className="text-sm text-gray-600">{server.description}</div>
                )}
                <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  Built-in
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Servers */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold">Custom Servers</h4>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {showAddForm ? 'Cancel' : 'Add Custom Server'}
          </button>
        </div>

        {servers && servers.custom.length > 0 ? (
          <div className="space-y-2">
            {servers.custom.map((server) => (
              <div
                key={server.name}
                className="p-3 bg-white border border-gray-300 rounded"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{server.name}</div>
                    {server.description && (
                      <div className="text-sm text-gray-600">{server.description}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      <code>{server.command} {server.args?.join(' ')}</code>
                    </div>
                    {server.env && Object.keys(server.env).length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Environment: {Object.keys(server.env).join(', ')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveServer(server.name)}
                    className="ml-4 px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showAddForm && (
            <p className="text-gray-500 text-sm">
              No custom servers configured. Click "Add Custom Server" to get started.
            </p>
          )
        )}
      </div>

      {/* Add Server Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-4 border border-gray-300 rounded">
          <h4 className="font-semibold mb-3">Add Custom MCP Server</h4>

          {/* Examples */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Quick Start Examples:</label>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_SERVERS.map((example) => (
                <button
                  key={example.name}
                  type="button"
                  onClick={() => loadExample(example)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                >
                  {example.name}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddServer} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Server Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., slack-workspace"
                className="w-full px-3 py-2 border border-gray-300 rounded"
                required
              />
              <p className="text-xs text-gray-600 mt-1">
                Unique identifier for this server instance
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Slack integration for #general channel"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Command <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.command}
                onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                required
              >
                <option value="npx">npx</option>
                <option value="node">node</option>
                <option value="python">python</option>
                <option value="python3">python3</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Arguments (one per line) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.argsText}
                onChange={(e) => setFormData({ ...formData, argsText: e.target.value })}
                placeholder="-y&#10;@modelcontextprotocol/server-slack"
                className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                rows={4}
                required
              />
              <p className="text-xs text-gray-600 mt-1">
                Each line becomes an argument to the command
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Environment Variables (KEY=value, one per line)
              </label>
              <textarea
                value={formData.envText}
                onChange={(e) => setFormData({ ...formData, envText: e.target.value })}
                placeholder="SLACK_BOT_TOKEN=xoxb-...&#10;SLACK_TEAM_ID=T123456"
                className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                rows={4}
              />
              <p className="text-xs text-gray-600 mt-1">
                Sensitive values like API keys. Use KEY=value format.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add Server
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

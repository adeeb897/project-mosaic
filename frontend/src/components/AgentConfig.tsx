/**
 * Agent Configuration Modal - Display agent settings and capabilities
 */
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { X, Cpu, Settings, Code, Edit2, Save } from 'lucide-react';

interface AgentConfig {
  id: string;
  name: string;
  type: string;
  status: string;
  sessionId: string;
  maxDepth: number;
  llm: {
    provider: string;
    model: string;
  };
  mcpServers: string[];
  tools: Array<{
    server: string;
    name: string;
    description: string;
    parameters: any;
  }>;
  metadata: Record<string, any>;
}

interface AgentConfigProps {
  agentId: string;
  onClose: () => void;
}

interface MCPServer {
  name: string;
  description: string;
  tools: Array<{ name: string; description: string }>;
}

export function AgentConfig({ agentId, onClose }: AgentConfigProps) {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState<{
    mcpServerNames: string[];
    maxDepth: number;
  } | null>(null);
  const [availableServers, setAvailableServers] = useState<MCPServer[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchAvailableServers();
  }, [agentId]);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(getApiUrl(`/api/agents/${agentId}/config`));
      setConfig(response.data.data);
    } catch (error) {
      console.error('Failed to fetch agent config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableServers = async () => {
    try {
      const response = await axios.get(getApiUrl('/api/agents/mcp-servers'));
      setAvailableServers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch MCP servers:', error);
    }
  };

  const startEditing = () => {
    if (!config) return;
    setEditedConfig({
      mcpServerNames: [...config.mcpServers],
      maxDepth: config.maxDepth,
    });
    setIsEditing(true);
  };

  const saveConfig = async () => {
    if (!editedConfig) return;

    setSaving(true);
    try {
      await axios.patch(getApiUrl(`/api/agents/${agentId}/config`), editedConfig);
      await fetchConfig();
      setIsEditing(false);
      setEditedConfig(null);
    } catch (error: any) {
      alert(`Failed to update configuration: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedConfig(null);
  };

  if (loading || !config) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <p className="text-gray-500 text-center">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{config.name}</h2>
              <p className="text-sm text-gray-600">Agent Configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={startEditing}
                disabled={config.status === 'running'}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={config.status === 'running' ? 'Stop the agent before editing' : ''}
              >
                <Edit2 size={16} />
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={cancelEditing}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Cpu size={18} className="text-purple-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Agent ID</p>
                <p className="font-mono text-sm text-gray-900">{config.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Session ID</p>
                <p className="font-mono text-sm text-gray-900">{config.sessionId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  config.status === 'running' ? 'bg-green-100 text-green-800' :
                  config.status === 'idle' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {config.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Max Task Depth</p>
                {isEditing && editedConfig ? (
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editedConfig.maxDepth}
                    onChange={(e) => setEditedConfig({
                      ...editedConfig,
                      maxDepth: parseInt(e.target.value) || 1
                    })}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">{config.maxDepth} levels</p>
                )}
              </div>
            </div>
          </div>

          {/* LLM Configuration */}
          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Code size={18} className="text-blue-600" />
              Language Model
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Provider</p>
                <p className="font-semibold text-gray-900">{config.llm.provider}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Model</p>
                <p className="font-semibold text-gray-900">{config.llm.model}</p>
              </div>
            </div>
          </div>

          {/* MCP Servers */}
          <div className="bg-gradient-to-br from-green-50 to-yellow-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">MCP Servers & Tools</h3>
            {isEditing && editedConfig ? (
              <div className="space-y-2">
                {availableServers.map((server) => (
                  <label
                    key={server.name}
                    className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={editedConfig.mcpServerNames.includes(server.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditedConfig({
                            ...editedConfig,
                            mcpServerNames: [...editedConfig.mcpServerNames, server.name]
                          });
                        } else {
                          setEditedConfig({
                            ...editedConfig,
                            mcpServerNames: editedConfig.mcpServerNames.filter(n => n !== server.name)
                          });
                        }
                      }}
                      className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{server.name}</div>
                      <div className="text-sm text-gray-600 mt-0.5">{server.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {server.tools.length} tool{server.tools.length !== 1 ? 's' : ''}: {server.tools.map(t => t.name).join(', ')}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {config.mcpServers.map((server) => (
                  <span
                    key={server}
                    className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 border border-gray-200"
                  >
                    {server}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          {Object.keys(config.metadata).length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Metadata</h3>
              <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                {JSON.stringify(config.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Agent Configuration Modal - Display and edit agent settings
 */
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { X, Cpu, Settings, Code, Save, Wrench, Key, Database, Plus, Trash2 } from 'lucide-react';
import { AgentFile, CoreMemoryBlock, LLMConfig } from '@mosaic/shared';

interface AvailableTool {
  name: string;
  description?: string;
  source_type: string;
  server: string;
  json_schema?: {
    type: string;
    parameters: any;
  };
}

interface AgentConfigData {
  id: string;
  name: string;
  type: string;
  status: string;
  sessionId: string;
  agentFile?: AgentFile;
  availableTools?: AvailableTool[];
  missingTools?: string[];
}

interface AgentConfigProps {
  agentId: string;
  onClose: () => void;
}

export function AgentConfig({ agentId, onClose }: AgentConfigProps) {
  const [config, setConfig] = useState<AgentConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable state
  const [editedCoreMemory, setEditedCoreMemory] = useState<CoreMemoryBlock[]>([]);
  const [editedLlmConfig, setEditedLlmConfig] = useState<LLMConfig | null>(null);
  const [editedEnvVars, setEditedEnvVars] = useState<Array<{ key: string; value: string; description?: string }>>([]);

  useEffect(() => {
    fetchConfig();
  }, [agentId]);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(getApiUrl(`/api/agents/${agentId}/config`));
      const data = response.data.data;
      setConfig(data);

      // Initialize editable state
      if (data.agentFile) {
        setEditedCoreMemory(data.agentFile.core_memory || []);
        setEditedLlmConfig(data.agentFile.llm_config || null);
        setEditedEnvVars(data.agentFile.tool_exec_environment_variables || []);
      }
    } catch (error) {
      console.error('Failed to fetch agent config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config?.agentFile) return;

    setSaving(true);
    try {
      await axios.patch(getApiUrl(`/api/agents/${agentId}`), {
        core_memory: editedCoreMemory,
        llm_config: editedLlmConfig,
        tool_exec_environment_variables: editedEnvVars,
      });

      await fetchConfig();
      alert('Configuration saved successfully!');
    } catch (error: any) {
      alert(`Failed to save configuration: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Core Memory Handlers
  const addCoreMemoryBlock = () => {
    const newBlock: CoreMemoryBlock = {
      created_at: new Date().toISOString(),
      is_template: false,
      label: 'new_block',
      limit: 2000,
      value: '',
      updated_at: new Date().toISOString(),
      metadata_: {},
    };
    setEditedCoreMemory([...editedCoreMemory, newBlock]);
  };

  const updateCoreMemoryBlock = (index: number, updates: Partial<CoreMemoryBlock>) => {
    const updated = [...editedCoreMemory];
    updated[index] = {
      ...updated[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setEditedCoreMemory(updated);
  };

  const deleteCoreMemoryBlock = (index: number) => {
    setEditedCoreMemory(editedCoreMemory.filter((_, i) => i !== index));
  };

  // Environment Variable Handlers
  const addEnvVar = () => {
    setEditedEnvVars([...editedEnvVars, { key: '', value: '', description: '' }]);
  };

  const updateEnvVar = (index: number, field: 'key' | 'value' | 'description', value: string) => {
    const updated = [...editedEnvVars];
    updated[index] = { ...updated[index], [field]: value };
    setEditedEnvVars(updated);
  };

  const deleteEnvVar = (index: number) => {
    setEditedEnvVars(editedEnvVars.filter((_, i) => i !== index));
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
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
            <button
              onClick={handleSave}
              disabled={saving || config.status === 'running'}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title={config.status === 'running' ? 'Stop the agent before saving' : 'Save changes'}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
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
                <p className="text-sm text-gray-600">Type</p>
                <p className="font-semibold text-gray-900">{config.type}</p>
              </div>
            </div>
          </div>

          {/* LLM Configuration */}
          {editedLlmConfig && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Code size={18} className="text-indigo-600" />
                LLM Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Model</label>
                  <input
                    type="text"
                    value={editedLlmConfig.model}
                    onChange={(e) => setEditedLlmConfig({ ...editedLlmConfig, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Endpoint Type</label>
                  <select
                    value={editedLlmConfig.model_endpoint_type || 'openai'}
                    onChange={(e) => setEditedLlmConfig({ ...editedLlmConfig, model_endpoint_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Context Window</label>
                  <input
                    type="number"
                    value={editedLlmConfig.context_window || 128000}
                    onChange={(e) => setEditedLlmConfig({ ...editedLlmConfig, context_window: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={editedLlmConfig.temperature || 0.7}
                    onChange={(e) => setEditedLlmConfig({ ...editedLlmConfig, temperature: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Core Memory */}
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Database size={18} className="text-pink-600" />
                Core Memory Blocks ({editedCoreMemory.length})
              </h3>
              <button
                onClick={addCoreMemoryBlock}
                className="px-3 py-1 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors text-sm flex items-center gap-1"
              >
                <Plus size={14} />
                Add Block
              </button>
            </div>
            <div className="space-y-3">
              {editedCoreMemory.map((block, idx) => (
                <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={block.label}
                      onChange={(e) => updateCoreMemoryBlock(idx, { label: e.target.value })}
                      className="font-semibold text-sm text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-pink-500 outline-none"
                      placeholder="Block label"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Limit:</span>
                      <input
                        type="number"
                        value={block.limit}
                        onChange={(e) => updateCoreMemoryBlock(idx, { limit: parseInt(e.target.value) })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                      <button
                        onClick={() => deleteCoreMemoryBlock(idx)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {block.description !== undefined && (
                    <input
                      type="text"
                      value={block.description || ''}
                      onChange={(e) => updateCoreMemoryBlock(idx, { description: e.target.value })}
                      className="w-full px-2 py-1 text-xs text-gray-600 mb-2 border border-gray-200 rounded"
                      placeholder="Description (optional)"
                    />
                  )}
                  <textarea
                    value={block.value}
                    onChange={(e) => updateCoreMemoryBlock(idx, { value: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 rounded border border-gray-200 text-xs text-gray-700 whitespace-pre-wrap font-mono"
                    rows={4}
                    placeholder="Memory content..."
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    {block.value.length} / {block.limit} characters
                  </div>
                </div>
              ))}
              {editedCoreMemory.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No core memory blocks. Click "Add Block" to create one.</p>
              )}
            </div>
          </div>

          {/* Available Tools from MCP Servers */}
          {config.availableTools && config.availableTools.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Wrench size={18} className="text-green-600" />
                Available Tools ({config.availableTools.length})
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                These are all tools currently registered and available from MCP servers
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {config.availableTools.map((tool, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm">{tool.server}.{tool.name}</h4>
                        {tool.description && (
                          <p className="text-xs text-gray-600 mt-1">{tool.description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                            {tool.server}
                          </span>
                          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {tool.source_type}
                          </span>
                        </div>
                      </div>
                    </div>
                    {tool.json_schema && tool.json_schema.parameters && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          Parameters
                        </summary>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(tool.json_schema.parameters, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Tools Warning */}
          {config.missingTools && config.missingTools.length > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border-2 border-red-200">
              <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <Wrench size={18} className="text-red-600" />
                Missing Tools ({config.missingTools.length})
              </h3>
              <p className="text-xs text-red-700 mb-3">
                These tools are in the agent configuration but are no longer available. They may have been unregistered or removed.
              </p>
              <div className="space-y-2">
                {config.missingTools.map((toolName, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-2 border border-red-300">
                    <p className="font-semibold text-red-900 text-sm">{toolName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stored Tools (from agent config) */}
          {config.agentFile && config.agentFile.tools && config.agentFile.tools.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Database size={18} className="text-blue-600" />
                Configured Tools ({config.agentFile.tools.length})
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                These tools are saved in the agent's configuration
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {config.agentFile.tools.map((tool, idx) => {
                  const isMissing = config.missingTools?.includes(tool.name);
                  return (
                    <div
                      key={idx}
                      className={`bg-white rounded-lg p-3 border ${
                        isMissing ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className={`font-semibold text-sm ${isMissing ? 'text-red-900' : 'text-gray-900'}`}>
                            {tool.name}
                            {isMissing && (
                              <span className="ml-2 px-2 py-0.5 bg-red-200 text-red-800 rounded text-xs">
                                MISSING
                              </span>
                            )}
                          </h4>
                          {tool.description && (
                            <p className="text-xs text-gray-600 mt-1">{tool.description}</p>
                          )}
                          {tool.source_type && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              {tool.source_type}
                            </span>
                          )}
                        </div>
                      </div>
                      {tool.json_schema && tool.json_schema.parameters && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            Parameters
                          </summary>
                          <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(tool.json_schema.parameters, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Environment Variables */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Key size={18} className="text-teal-600" />
                Environment Variables ({editedEnvVars.length})
              </h3>
              <button
                onClick={addEnvVar}
                className="px-3 py-1 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors text-sm flex items-center gap-1"
              >
                <Plus size={14} />
                Add Variable
              </button>
            </div>
            <div className="space-y-2">
              {editedEnvVars.map((envVar, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={envVar.key}
                      onChange={(e) => updateEnvVar(idx, 'key', e.target.value)}
                      className="flex-1 px-2 py-1 font-mono text-sm font-semibold border border-gray-300 rounded"
                      placeholder="KEY"
                    />
                    <input
                      type="text"
                      value={envVar.value}
                      onChange={(e) => updateEnvVar(idx, 'value', e.target.value)}
                      className="flex-1 px-2 py-1 font-mono text-sm border border-gray-300 rounded"
                      placeholder="value"
                    />
                    <button
                      onClick={() => deleteEnvVar(idx)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={envVar.description || ''}
                    onChange={(e) => updateEnvVar(idx, 'description', e.target.value)}
                    className="w-full px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded"
                    placeholder="Description (optional)"
                  />
                </div>
              ))}
              {editedEnvVars.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No environment variables. Click "Add Variable" to create one.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

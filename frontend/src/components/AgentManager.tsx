/**
 * Agent Manager - Create and manage agents
 * Enhanced with pastel theme and beautiful styling
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Play,
  Square,
  Trash2,
  Sparkles,
  Bot,
  Eye,
  Settings,
  Target,
  Upload,
  Download,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { RealtimeEvent } from '@/hooks/useWebSocket';
import { getApiUrl } from '@/config/api';
import { AgentConfig } from './AgentConfig';
import { AgentChatCard } from './AgentChatCard';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  sessionId: string;
  createdAt: string;
  config: {
    llm_config: {
      model: string;
      model_endpoint_type?: string;
      context_window?: number;
      temperature?: number;
    };
  };
  metadata?: {
    currentTaskId?: string;
    rootTask?: string;
  };
}

interface Task {
  id: string;
  title: string;
  status: string;
}

interface AgentManagerProps {
  onSessionSelect: (agentId: string) => void;
  realtimeEvents: RealtimeEvent[];
}

interface MCPServer {
  name: string;
  version: string;
  description: string;
  tools: Array<{ name: string; description: string }>;
}

interface ModelProvider {
  id: string;
  name: string;
  models: Array<{
    id: string;
    name: string;
    contextWindow: number;
    supportsVision: boolean;
    supportsFunctionCalling: boolean;
  }>;
}

export function AgentManager({ onSessionSelect, realtimeEvents }: AgentManagerProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [modelProviders, setModelProviders] = useState<ModelProvider[]>([]);
  const [currentTasks, setCurrentTasks] = useState<Record<string, Task>>({});
  const [formData, setFormData] = useState({
    name: '',
    llmProvider: '',
    model: '',
    mcpServerNames: [] as string[],
    useE2B: false,
    enableSelfConfig: false,
  });

  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch agents, MCP servers, and available models
  useEffect(() => {
    fetchAgents();
    fetchMcpServers();
    fetchModels();
  }, []);

  // Update agents from realtime events
  useEffect(() => {
    const latestEvent = realtimeEvents[0];
    if (latestEvent?.type === 'agent:started' || latestEvent?.type === 'agent:stopped') {
      fetchAgents();
    }
  }, [realtimeEvents]);

  const fetchAgents = async () => {
    try {
      const response = await axios.get(getApiUrl('/api/agents'));
      const agentsData = response.data.data;
      setAgents(agentsData);

      // Fetch current tasks for all agents
      const taskPromises = agentsData
        .filter((agent: Agent) => agent.metadata?.currentTaskId)
        .map(async (agent: Agent) => {
          try {
            const taskResponse = await axios.get(getApiUrl(`/api/tasks?id=${agent.metadata!.currentTaskId}`));
            const tasks = taskResponse.data.data;
            return { agentId: agent.id, task: tasks.find((t: Task) => t.id === agent.metadata!.currentTaskId) };
          } catch {
            return null;
          }
        });

      const taskResults = await Promise.all(taskPromises);
      const tasksMap: Record<string, Task> = {};
      taskResults.forEach((result) => {
        if (result && result.task) {
          tasksMap[result.agentId] = result.task;
        }
      });
      setCurrentTasks(tasksMap);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMcpServers = async () => {
    try {
      const response = await axios.get(getApiUrl('/api/agents/mcp-servers'));
      setMcpServers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch MCP servers:', error);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await axios.get(getApiUrl('/api/agents/models'));
      const providers = response.data.data;
      setModelProviders(providers);

      // Set default provider and model if available
      if (providers.length > 0 && !formData.llmProvider) {
        const defaultProvider = providers[0];
        setFormData(prev => ({
          ...prev,
          llmProvider: defaultProvider.id,
          model: defaultProvider.models[0]?.id || '',
        }));
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

  const createAgent = async () => {
    try {
      const payload = {
        name: formData.name,
        llmProvider: formData.llmProvider,
        model: formData.model,
        mcpServerNames: formData.mcpServerNames,
        useE2B: formData.useE2B,
        enableSelfConfig: formData.enableSelfConfig,
      };

      const response = await axios.post(getApiUrl('/api/agents'), payload);
      const newAgent = response.data.data;
      setAgents([...agents, newAgent]);
      setShowCreateForm(false);

      // Reset form with default provider/model
      const defaultProvider = modelProviders[0];
      setFormData({
        name: '',
        llmProvider: defaultProvider?.id || '',
        model: defaultProvider?.models[0]?.id || '',
        mcpServerNames: [],
        useE2B: false,
        enableSelfConfig: false,
      });
    } catch (error: any) {
      alert(`Failed to create agent: ${error.response?.data?.error || error.message}`);
    }
  };

  const startAgent = async (id: string) => {
    try {
      await axios.post(getApiUrl(`/api/agents/${id}/start`));
      fetchAgents();
    } catch (error: any) {
      alert(`Failed to start agent: ${error.response?.data?.error || error.message}`);
    }
  };

  const pauseAgent = async (id: string) => {
    try {
      await axios.post(getApiUrl(`/api/agents/${id}/pause`));
      fetchAgents();
    } catch (error: any) {
      alert(`Failed to pause agent: ${error.response?.data?.error || error.message}`);
    }
  };

  const resumeAgent = async (id: string) => {
    try {
      await axios.post(getApiUrl(`/api/agents/${id}/resume`));
      fetchAgents();
    } catch (error: any) {
      alert(`Failed to resume agent: ${error.response?.data?.error || error.message}`);
    }
  };

  const deleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      await axios.delete(getApiUrl(`/api/agents/${id}`));
      setAgents(agents.filter((a) => a.id !== id));
    } catch (error: any) {
      alert(`Failed to delete agent: ${error.response?.data?.error || error.message}`);
    }
  };

  // Export agent to .af file
  const handleExportAgent = async (agentId: string) => {
    try {
      const agent = agents.find(a => a.id === agentId);
      const agentName = agent?.name || 'agent';

      // Using blob download approach for better control
      const response = await axios.get(
        getApiUrl(`/api/agents/${agentId}/export/download`),
        {
          responseType: 'blob',
          params: {
            includeMessages: 'true',
            includeTools: 'true',
            includeMemory: 'true',
          }
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${agentName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.af.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Agent "${agentName}" exported successfully`);
    } catch (error: any) {
      toast.error(`Failed to export agent: ${error.response?.data?.error || error.message}`);
    }
  };

  // Trigger file input for import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Import agent from .af file
  const handleImportAgent = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Read file content
      const content = await file.text();
      const agentFile = JSON.parse(content);

      // Import agent
      const response = await axios.post(
        getApiUrl('/api/agents/import'),
        agentFile,
        {
          params: {
            overwriteExisting: 'false',
            preserveId: 'false',
          }
        }
      );

      const importedAgent = response.data.data;
      toast.success(`Agent "${importedAgent.name}" imported successfully`);

      // Refresh agent list
      fetchAgents();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message;
      toast.error(`Failed to import agent: ${errorMsg}`);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return 'badge badge-success';
      case 'idle':
        return 'badge badge-neutral';
      case 'stopped':
        return 'badge badge-error';
      default:
        return 'badge badge-neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".af,.af.json,.json,application/json"
        onChange={handleImportAgent}
        className="hidden"
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold gradient-text">Agents</h2>
          <p className="text-gray-600 mt-2">Create and manage autonomous agents</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleImportClick}
            className="btn-secondary flex items-center gap-2"
            title="Import agent from .af file"
          >
            <Upload size={18} />
            Import
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Create Agent
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="card animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Create New Agent</h3>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Agent Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., ResearchAgent"
                className="input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">LLM Provider</label>
                <select
                  value={formData.llmProvider}
                  onChange={(e) => {
                    const selectedProvider = modelProviders.find(p => p.id === e.target.value);
                    setFormData({
                      ...formData,
                      llmProvider: e.target.value,
                      model: selectedProvider?.models[0]?.id || '',
                    });
                  }}
                  className="input"
                >
                  {modelProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="input"
                >
                  {modelProviders
                    .find(p => p.id === formData.llmProvider)
                    ?.models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                        {model.supportsVision && ' 👁️'}
                      </option>
                    ))}
                </select>
                {formData.model && (
                  <p className="text-xs text-gray-500 mt-1">
                    {(() => {
                      const selectedModel = modelProviders
                        .find(p => p.id === formData.llmProvider)
                        ?.models.find(m => m.id === formData.model);
                      return selectedModel ? (
                        <>
                          {(selectedModel.contextWindow / 1000).toFixed(0)}k context
                          {selectedModel.supportsVision && ' • Vision'}
                          {selectedModel.supportsFunctionCalling && ' • Function Calling'}
                        </>
                      ) : null;
                    })()}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tools & Capabilities
              </label>
              <div className="space-y-2 bg-gray-50 rounded-xl p-4 border border-gray-200">
                {mcpServers.length === 0 ? (
                  <p className="text-sm text-gray-500">No tools available</p>
                ) : (
                  mcpServers.map((server) => (
                    <label
                      key={server.name}
                      className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.mcpServerNames.includes(server.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              mcpServerNames: [...formData.mcpServerNames, server.name],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              mcpServerNames: formData.mcpServerNames.filter(
                                (name) => name !== server.name
                              ),
                            });
                          }
                        }}
                        className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{server.name}</div>
                        <div className="text-sm text-gray-600 mt-0.5">{server.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {server.tools.length} tool{server.tools.length !== 1 ? 's' : ''}:{' '}
                          {server.tools.map((t) => t.name).join(', ')}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Select which tools this agent should have access to (leave empty for all tools)
              </p>
            </div>

            {/* E2B Sandbox Option */}
            <div>
              <label className="flex items-start gap-3 p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border-2 border-green-200 cursor-pointer hover:border-green-300 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.useE2B}
                  onChange={(e) => setFormData({ ...formData, useE2B: e.target.checked })}
                  className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">Enable E2B Sandbox</span>
                    <span className="px-2 py-0.5 text-xs bg-green-600 text-white rounded-full">Safe Code Execution</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Run Python code in a secure, isolated cloud sandbox. Enables data analysis, calculations, and file processing with complete safety.
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Requires E2B_API_KEY in environment. Get yours at <a href="https://e2b.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">e2b.dev</a>
                  </div>
                </div>
              </label>
            </div>

            {/* Self-Configuration Option */}
            <div>
              <label className="flex items-start gap-3 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 cursor-pointer hover:border-purple-300 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.enableSelfConfig}
                  onChange={(e) => setFormData({ ...formData, enableSelfConfig: e.target.checked })}
                  className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">Enable Self-Configuration</span>
                    <span className="px-2 py-0.5 text-xs bg-purple-600 text-white rounded-full">Autonomous Setup</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Allow the agent to add and manage its own MCP server integrations. The agent can autonomously enable integrations like Slack, GitHub, Google Maps, and more when needed.
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    The agent will ask you for API keys and credentials before adding new integrations.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={createAgent} disabled={!formData.name} className="btn-primary">
                Create Agent
              </button>
              <button onClick={() => setShowCreateForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agents List */}
      {loading ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
            <span className="text-gray-500">Loading agents...</span>
          </div>
        </div>
      ) : agents.length === 0 ? (
        <div className="card border-2 border-dashed">
          <div className="text-center py-16">
            <Bot className="w-20 h-20 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg mb-2">No agents yet</p>
            <p className="text-gray-400 text-sm">Create your first agent to get started!</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentChatCard
              key={agent.id}
              agent={agent}
              onStart={startAgent}
              onStop={pauseAgent}
              onDelete={deleteAgent}
              onExport={handleExportAgent}
              onConfig={setSelectedAgentId}
              currentTask={currentTasks[agent.id]}
            />
          ))}
        </div>
      )}

      {/* Backup: Old card format - DELETE THESE LINES */}
      {false && (
        <div className="hidden">
          {agents.map((agent) => (
            <div key={agent.id} className="card group">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center shadow-lg">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{agent.name}</h3>
                        <span className={getStatusBadge(agent.status)}>{agent.status}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Created {new Date(agent.createdAt).toLocaleDateString()} at{' '}
                        {new Date(agent.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-white/60 rounded-lg">
                      Model: {agent.config?.llm?.model || agent.config?.model || 'N/A'}
                    </span>
                    {agent.config?.llm?.provider && (
                      <span className="px-2 py-1 bg-white/60 rounded-lg">
                        {agent.config.llm.provider.replace('-provider', '')}
                      </span>
                    )}
                    <span className="px-2 py-1 bg-white/60 rounded-lg">
                      ID: {agent.id.slice(0, 8)}
                    </span>
                  </div>

                  {/* Current Task Display */}
                  {currentTasks[agent.id] && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 rounded-xl">
                      <div className="flex items-start gap-2">
                        <Target size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-orange-900 mb-1">Current Task</p>
                          <p className="text-sm text-orange-800 font-medium truncate">
                            {currentTasks[agent.id].title}
                          </p>
                          <span className={`inline-block mt-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                            currentTasks[agent.id].status === 'completed' ? 'bg-green-100 text-green-700' :
                            currentTasks[agent.id].status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            currentTasks[agent.id].status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {currentTasks[agent.id].status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {!currentTasks[agent.id] && agent.status === 'idle' && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="text-xs text-gray-500 text-center">No task assigned - Assign a task from the Task Board</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {agent.status === 'running' && (
                    <button
                      onClick={() => pauseAgent(agent.id)}
                      className="p-3 rounded-xl bg-yellow-100 text-yellow-700 hover:bg-yellow-200 hover:shadow-lg transition-all duration-300 group"
                      title="Pause Agent"
                    >
                      <Square size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                  {agent.status === 'paused' && (
                    <button
                      onClick={() => resumeAgent(agent.id)}
                      className="p-3 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 hover:shadow-lg transition-all duration-300 group"
                      title="Resume Agent"
                    >
                      <Play size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteAgent(agent.id)}
                    className="p-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-lg transition-all duration-300 group"
                    title="Delete Agent"
                  >
                    <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => onSessionSelect(agent.id)}
                  className="py-3 px-4 bg-gradient-to-r from-purple-400 to-blue-400 text-white rounded-xl font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Eye size={18} />
                  Activity
                </button>
                <button
                  onClick={() => setSelectedAgentId(agent.id)}
                  className="py-3 px-4 bg-gradient-to-r from-green-400 to-teal-400 text-white rounded-xl font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Settings size={18} />
                  Config
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Config Modal */}
      {selectedAgentId && (
        <AgentConfig agentId={selectedAgentId} onClose={() => setSelectedAgentId(null)} />
      )}

    </div>
  );
}

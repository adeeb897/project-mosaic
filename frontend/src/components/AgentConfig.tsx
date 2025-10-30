/**
 * Agent Configuration Modal - Display agent settings and capabilities
 */
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { X, Cpu, Wrench, Settings, Code } from 'lucide-react';

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

export function AgentConfig({ agentId, onClose }: AgentConfigProps) {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
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
                <p className="text-sm text-gray-600">Type</p>
                <p className="font-semibold text-gray-900">{config.type}</p>
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
                <p className="text-sm text-gray-600">Max Goal Depth</p>
                <p className="font-semibold text-gray-900">{config.maxDepth} levels</p>
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
            <h3 className="font-semibold text-gray-900 mb-3">MCP Servers</h3>
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
          </div>

          {/* Available Tools */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Wrench size={18} className="text-orange-600" />
              Available Tools ({config.tools.length})
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {config.tools.map((tool, index) => (
                <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {tool.server}.{tool.name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                      {tool.parameters?.required && (
                        <p className="text-xs text-gray-500 mt-2">
                          Required: {tool.parameters.required.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

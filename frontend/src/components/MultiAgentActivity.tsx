/**
 * Multi-Agent Activity Timeline - Concise view for multiple agents
 */
'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import { RealtimeEvent } from '@/hooks/useWebSocket';
import { getApiUrl } from '@/config/api';
import {
  Activity,
  Bot,
  MessageSquare,
  Wrench,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw
} from 'lucide-react';

interface ActionRecord {
  id: string;
  timestamp: Date;
  agentId: string;
  type: string;
  status: string;
  action: string;
  details?: {
    tool?: string;
    reasoning?: string;
    metadata?: any;
  };
}

interface AgentInfo {
  id: string;
  name: string;
  status: string;
}

interface MultiAgentActivityProps {
  realtimeEvents: RealtimeEvent[];
}

export function MultiAgentActivity({ realtimeEvents }: MultiAgentActivityProps) {
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [agents, setAgents] = useState<Map<string, AgentInfo>>(new Map());
  const [filter, setFilter] = useState<'all' | 'messages' | 'tools' | 'goals'>('all');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchAgents();
    fetchAllActivity();

    if (autoRefresh) {
      const interval = setInterval(fetchAllActivity, 3000); // Refresh every 3 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  useEffect(() => {
    if (realtimeEvents.length > 0) {
      fetchAllActivity();
    }
  }, [realtimeEvents]);

  const fetchAgents = async () => {
    try {
      const response = await axios.get(getApiUrl('/api/agents'));
      const agentMap = new Map<string, AgentInfo>();
      response.data.data.forEach((agent: any) => {
        agentMap.set(agent.id, {
          id: agent.id,
          name: agent.name,
          status: agent.status,
        });
      });
      setAgents(agentMap);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const fetchAllActivity = async () => {
    try {
      // Get all sessions and fetch their timelines
      const agentsResponse = await axios.get(getApiUrl('/api/agents'));
      const allActions: ActionRecord[] = [];

      for (const agent of agentsResponse.data.data) {
        try {
          const timelineResponse = await axios.get(
            getApiUrl(`/api/sessions/${agent.sessionId}/timeline`),
            { params: { limit: 50 } }
          );

          const sessionActions = timelineResponse.data.data.map((entry: any) => ({
            id: entry.id,
            timestamp: new Date(entry.timestamp),
            agentId: entry.agentId || agent.id,
            type: entry.type,
            status: entry.status,
            action: entry.summary || entry.description || entry.title,
            details: entry.technicalDetails || entry.details,
          }));

          allActions.push(...sessionActions);
        } catch (err) {
          // Skip if session has no timeline yet
        }
      }

      // Sort by timestamp descending
      allActions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActions(allActions.slice(0, 100)); // Keep last 100 actions
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'agent_message':
        return <MessageSquare size={16} className="text-blue-600" />;
      case 'tool_invoked':
        return <Wrench size={16} className="text-purple-600" />;
      case 'goal_started':
      case 'goal_completed':
      case 'goal_failed':
        return <Target size={16} className="text-green-600" />;
      default:
        return <Activity size={16} className="text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={14} className="text-green-600" />;
      case 'failed':
        return <AlertCircle size={14} className="text-red-600" />;
      case 'started':
        return <Clock size={14} className="text-blue-600" />;
      default:
        return null;
    }
  };

  const filteredActions = actions.filter((action) => {
    if (filter === 'all') return true;
    if (filter === 'messages') return action.type === 'agent_message';
    if (filter === 'tools') return action.type === 'tool_invoked';
    if (filter === 'goals') return action.type.includes('goal');
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Multi-Agent Activity</h2>
              <p className="text-gray-600 mt-1">
                Live feed of all agent actions
              </p>
            </div>
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              autoRefresh
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <RefreshCw size={16} className={autoRefresh ? 'animate-spin' : ''} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
        </div>

        {/* Agent Status Bar */}
        <div className="bg-white/80 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot size={16} className="text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Active Agents ({agents.size})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(agents.values()).map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    agent.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                  }`}
                />
                <span className="text-sm font-medium text-gray-700">{agent.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-4">
          <Filter size={16} className="text-gray-600" />
          <span className="text-sm font-semibold text-gray-700 mr-2">Filter:</span>
          {(['all', 'messages', 'tools', 'goals'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === filterType
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Loading activity...</p>
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <Activity size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No activity yet. Start an agent to see actions!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredActions.map((action) => {
            const agent = agents.get(action.agentId);
            return (
              <div
                key={action.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(action.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {/* Agent badge */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                            {agent?.name || 'Unknown Agent'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(action.timestamp, { addSuffix: true })}
                          </span>
                          {getStatusIcon(action.status)}
                        </div>

                        {/* Action text */}
                        <p className="text-sm text-gray-900 leading-relaxed">
                          {action.action}
                        </p>

                        {/* Reasoning/Details */}
                        {action.details?.reasoning && (
                          <p className="text-xs text-gray-600 mt-1 italic">
                            {action.details.reasoning}
                          </p>
                        )}

                        {/* Tool details */}
                        {action.details?.tool && (
                          <div className="mt-2">
                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                              {action.details.tool}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Multi-Agent Activity Timeline - Concise view for multiple agents
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format, isSameDay, addDays, subDays } from 'date-fns';
import axios from 'axios';
import { RealtimeEvent } from '@/hooks/useWebSocket';
import { getApiUrl } from '@/config/api';
import {
  Activity,
  Bot,
  Wrench,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
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
    params?: any;
    result?: any;
    screenshotUrl?: string;
  };
}

interface AgentInfo {
  id: string;
  name: string;
  status: string;
}

interface MultiAgentActivityProps {
  realtimeEvents: RealtimeEvent[];
  initialAgentId?: string;
  initialTaskId?: string;
}

export function MultiAgentActivity({ realtimeEvents, initialAgentId, initialTaskId }: MultiAgentActivityProps) {
  const router = useRouter();
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [agents, setAgents] = useState<Map<string, AgentInfo>>(new Map());
  const [filter, setFilter] = useState<'all' | 'messages' | 'tools' | 'tasks'>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [expandedToolUses, setExpandedToolUses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Update URL when filters change
  const updateURL = (agentId: string | null, taskId: string | null) => {
    const params = new URLSearchParams({ tab: 'activity' });
    if (agentId) params.set('agentId', agentId);
    if (taskId) params.set('taskId', taskId);
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  // Set initial filters from URL params
  useEffect(() => {
    if (initialAgentId) {
      setSelectedAgentId(initialAgentId);
    }
    if (initialTaskId) {
      setSelectedTaskId(initialTaskId);
    }
  }, [initialAgentId, initialTaskId]);

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

          const sessionActions = timelineResponse.data.data.map((entry: any) => {
            const details = entry.technicalDetails || entry.details || {};
            return {
              id: entry.id,
              timestamp: new Date(entry.timestamp),
              agentId: entry.agentId || agent.id,
              type: entry.type,
              status: entry.status,
              action: entry.summary || entry.description || entry.title,
              details,
            };
          });

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

  const toggleToolExpansion = (actionId: string) => {
    const newExpanded = new Set(expandedToolUses);
    if (newExpanded.has(actionId)) {
      newExpanded.delete(actionId);
    } else {
      newExpanded.add(actionId);
    }
    setExpandedToolUses(newExpanded);
  };

  const getAgentColor = (agentId: string): string => {
    // Generate consistent color for each agent
    const colors = [
      'from-purple-400 to-blue-400',
      'from-blue-400 to-green-400',
      'from-green-400 to-yellow-400',
      'from-yellow-400 to-orange-400',
      'from-orange-400 to-red-400',
      'from-red-400 to-pink-400',
      'from-pink-400 to-purple-400',
    ];
    const hash = agentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getAgentBgColor = (agentId: string): string => {
    const bgColors = [
      'bg-purple-50 border-purple-200',
      'bg-blue-50 border-blue-200',
      'bg-green-50 border-green-200',
      'bg-yellow-50 border-yellow-200',
      'bg-orange-50 border-orange-200',
      'bg-red-50 border-red-200',
      'bg-pink-50 border-pink-200',
    ];
    const hash = agentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return bgColors[hash % bgColors.length];
  };

  const filteredActions = actions.filter((action) => {
    // Filter by date
    if (!isSameDay(action.timestamp, selectedDate)) return false;

    // Filter by type
    if (filter !== 'all') {
      if (filter === 'messages' && action.type !== 'agent_message') return false;
      if (filter === 'tools' && action.type !== 'tool_invoked') return false;
      if (filter === 'tasks' && !action.type.includes('task')) return false;
    }

    // Filter by agent
    if (selectedAgentId && action.agentId !== selectedAgentId) return false;

    // Filter by task
    if (selectedTaskId && action.details?.metadata?.taskId !== selectedTaskId) return false;

    return true;
  });

  const goToPreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    const nextDay = addDays(selectedDate, 1);
    // Don't allow going into the future
    if (nextDay <= new Date()) {
      setSelectedDate(nextDay);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = isSameDay(selectedDate, new Date());

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
              <p className="text-gray-600 mt-1">Live feed of all agent actions</p>
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

        {/* Date Navigation */}
        <div className="bg-white/80 rounded-xl p-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Date:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousDay}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Previous day"
              >
                <ChevronLeft size={20} className="text-gray-700" />
              </button>

              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-900"
              >
                {format(selectedDate, 'MMMM d, yyyy')}
              </button>

              <button
                onClick={goToNextDay}
                disabled={isToday}
                className={`p-2 rounded-lg transition-colors ${
                  isToday ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-700'
                }`}
                title="Next day"
              >
                <ChevronRight size={20} />
              </button>

              {!isToday && (
                <button
                  onClick={goToToday}
                  className="ml-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Simple Date Picker */}
          {showDatePicker && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setSelectedDate(newDate);
                  setShowDatePicker(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="space-y-3 mt-4">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-600" />
            <span className="text-sm font-semibold text-gray-700 mr-2">Type:</span>
            {(['all', 'messages', 'tools', 'tasks'] as const).map((filterType) => (
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

          {/* Agent and Task Filters */}
          <div className="flex items-center gap-4">
            {/* Agent Filter */}
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Agent:</span>
              <select
                value={selectedAgentId || ''}
                onChange={(e) => {
                  const newAgentId = e.target.value || null;
                  setSelectedAgentId(newAgentId);
                  updateURL(newAgentId, selectedTaskId);
                }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="">All Agents</option>
                {Array.from(agents.values()).map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Task Filter */}
            <div className="flex items-center gap-2">
              <Target size={16} className="text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Task:</span>
              <input
                type="text"
                placeholder="Task ID (optional)"
                value={selectedTaskId || ''}
                onChange={(e) => {
                  const newTaskId = e.target.value || null;
                  setSelectedTaskId(newTaskId);
                  updateURL(selectedAgentId, newTaskId);
                }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 w-48"
              />
            </div>

            {/* Clear Filters */}
            {(selectedAgentId || selectedTaskId) && (
              <button
                onClick={() => {
                  setSelectedAgentId(null);
                  setSelectedTaskId(null);
                  updateURL(null, null);
                }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Activity Feed - Chat Style */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Loading activity...</p>
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <Activity size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No activity yet. Start an agent to see actions!</p>
        </div>
      ) : (
        <div className="bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200 p-3 space-y-2 max-h-[700px] overflow-y-auto">
          {filteredActions.map((action) => {
            const agent = agents.get(action.agentId);
            const isExpanded = expandedToolUses.has(action.id);
            const isToolUse = action.type === 'tool_invoked';

            return (
              <div
                key={action.id}
                className={`flex gap-2 p-2 rounded-lg border transition-all hover:shadow-sm ${getAgentBgColor(action.agentId)}`}
              >
                {/* Agent Avatar */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAgentColor(action.agentId)} flex items-center justify-center shadow-sm`}
                  >
                    <Bot size={16} className="text-white" />
                  </div>
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  {/* Header - Inline */}
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-gray-900">
                      {agent?.name || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(action.timestamp, { addSuffix: true })}
                    </span>
                    {getStatusIcon(action.status)}
                  </div>

                  {/* Message Body - Compact */}
                  <div className="space-y-1">
                    <p className="text-sm text-gray-800 leading-snug">{action.action}</p>

                    {/* Reasoning - More compact */}
                    {action.details?.reasoning && (
                      <p className="text-xs text-gray-500 italic pl-2 border-l-2 border-gray-300">
                        {action.details.reasoning}
                      </p>
                    )}

                    {/* Tool Use - Compact and expandable */}
                    {isToolUse && action.details?.tool && (
                      <div className="pt-1">
                        <button
                          onClick={() => toggleToolExpansion(action.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white/80 px-2 py-1 rounded border border-gray-200 hover:border-gray-300 transition-all"
                        >
                          <Wrench size={12} />
                          <span className="font-mono">{action.details.tool}</span>
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 bg-white/90 rounded border border-gray-200 p-2 space-y-2">
                            {/* Parameters */}
                            {action.details.params && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1">Input:</p>
                                <pre className="text-xs bg-gray-50 p-1.5 rounded border border-gray-200 overflow-x-auto max-h-32">
                                  {JSON.stringify(action.details.params, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Result */}
                            {action.details.result && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                                  {action.status === 'completed' ? <>✓ Output:</> : <>✗ Error:</>}
                                </p>
                                <pre
                                  className={`text-xs p-1.5 rounded border overflow-x-auto max-h-32 ${
                                    action.status === 'completed'
                                      ? 'bg-green-50 border-green-200 text-green-900'
                                      : 'bg-red-50 border-red-200 text-red-900'
                                  }`}
                                >
                                  {typeof action.details.result === 'string'
                                    ? action.details.result
                                    : JSON.stringify(action.details.result, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Browser Screenshot - if any */}
                    {(() => {
                      if (action.details?.result?.data?.screenshot?.base64) {
                        const screenshot = action.details.result.data.screenshot;
                        return (
                          <div className="mt-2 bg-white/90 rounded-lg border border-gray-200 p-2">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-xs font-semibold text-gray-600">
                                Screenshot from {action.details.tool}
                              </div>
                              {screenshot.url && (
                                <div className="text-xs text-gray-500 truncate max-w-xs">
                                  {screenshot.url}
                                </div>
                              )}
                            </div>
                            <img
                              src={`data:image/png;base64,${screenshot.base64}`}
                              alt="Browser Screenshot"
                              className="w-full max-w-2xl h-auto rounded border border-gray-300 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                              onClick={(e) => {
                                // Open in new tab on click
                                window.open((e.target as HTMLImageElement).src, '_blank');
                              }}
                            />
                          </div>
                        );
                      }
                      return null;
                    })()}
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

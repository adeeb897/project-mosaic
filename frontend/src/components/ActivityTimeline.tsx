/**
 * Activity Timeline - Live feed of agent actions
 * Enhanced UI with conversation view and tool usage details
 */
'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import { RealtimeEvent } from '@/hooks/useWebSocket';
import { getApiUrl } from '@/config/api';
import {
  Filter,
  Image as ImageIcon,
  MessageSquare,
  Wrench,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Code,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface TimelineEntry {
  id: string;
  timestamp: Date;
  agentId: string;
  agentName: string;
  title: string;
  description: string;
  type: string;
  status: string;
  icon: string;
  color: string;
  screenshotUrl?: string;
  goalId?: string;
  goalTitle?: string;
  summary: string;
  details?: {
    tool?: string;
    params?: any;
    result?: any;
    error?: any;
    metadata?: any;
  };
}

interface ActivityTimelineProps {
  sessionId: string;
  realtimeEvents: RealtimeEvent[];
}

export function ActivityTimeline({ sessionId, realtimeEvents }: ActivityTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'goals' | 'tools' | 'errors'>('all');
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTimeline();
  }, [sessionId]);

  // Add new entries from realtime events
  useEffect(() => {
    const latestEvent = realtimeEvents[0];
    if (latestEvent && shouldAddToTimeline(latestEvent)) {
      fetchTimeline();
    }
  }, [realtimeEvents]);

  const fetchTimeline = async () => {
    try {
      const response = await axios.get(
        getApiUrl(`/api/sessions/${sessionId}/timeline`),
        { params: { limit: 100 } }
      );
      setTimeline(response.data.data);
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const shouldAddToTimeline = (event: RealtimeEvent): boolean => {
    return ['action:recorded', 'goal:created', 'goal:updated', 'agent:progress'].includes(
      event.type
    );
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const filteredTimeline = timeline.filter((entry) => {
    if (filter === 'all') return true;
    if (filter === 'goals') return entry.type.startsWith('goal_');
    if (filter === 'tools') return entry.type === 'tool_invoked';
    if (filter === 'errors') return entry.status === 'failed';
    return true;
  });

  const getEntryIcon = (entry: TimelineEntry) => {
    if (entry.type === 'tool_invoked') return <Wrench className="w-5 h-5" />;
    if (entry.type.startsWith('goal_')) return <Target className="w-5 h-5" />;
    if (entry.status === 'failed') return <AlertCircle className="w-5 h-5" />;
    return <MessageSquare className="w-5 h-5" />;
  };

  const getEntryStyle = (entry: TimelineEntry) => {
    if (entry.type === 'tool_invoked') return 'conversation-bubble-tool';
    if (entry.status === 'failed') return 'conversation-bubble-error';
    return 'conversation-bubble-agent';
  };

  const renderDetails = (entry: TimelineEntry) => {
    if (!entry.details) return null;

    return (
      <div className="mt-4 space-y-3">
        {entry.details.tool && (
          <div className="flex items-start gap-2">
            <Wrench className="w-4 h-4 mt-1 text-gray-500" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-gray-700">Tool: </span>
              <span className="text-sm text-gray-600">{entry.details.tool}</span>
            </div>
          </div>
        )}

        {entry.details.params && Object.keys(entry.details.params).length > 0 && (
          <div className="flex items-start gap-2">
            <Code className="w-4 h-4 mt-1 text-gray-500" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-gray-700">Parameters:</span>
              <pre className="mt-1 p-3 bg-black/5 rounded-xl text-xs overflow-x-auto">
                {JSON.stringify(entry.details.params, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {entry.details.result && (
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-1 text-green-600" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-gray-700">Result:</span>
              <pre className="mt-1 p-3 bg-green-50/50 rounded-xl text-xs overflow-x-auto">
                {typeof entry.details.result === 'string'
                  ? entry.details.result
                  : JSON.stringify(entry.details.result, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {entry.details.error && (
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-1 text-red-600" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-red-700">Error:</span>
              <pre className="mt-1 p-3 bg-red-50/50 rounded-xl text-xs overflow-x-auto text-red-800">
                {typeof entry.details.error === 'string'
                  ? entry.details.error
                  : JSON.stringify(entry.details.error, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold gradient-text">Activity Timeline</h2>
          <p className="text-gray-600 mt-2">Live feed of agent actions and decisions</p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Filter size={20} className="text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="input w-auto"
          >
            <option value="all">All Events</option>
            <option value="goals">Goals Only</option>
            <option value="tools">Tool Usage</option>
            <option value="errors">Errors Only</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="card">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center gap-3">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              <span className="text-gray-500">Loading timeline...</span>
            </div>
          </div>
        ) : filteredTimeline.length === 0 ? (
          <div className="p-12 text-center">
            <Zap className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              No activity yet. Start an agent to see live updates!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTimeline.map((entry, index) => (
              <div key={entry.id} className={index < filteredTimeline.length - 1 ? 'timeline-item' : 'relative pl-8'}>
                <div className={`conversation-bubble ${getEntryStyle(entry)}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center shadow-sm">
                        {getEntryIcon(entry)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">{entry.summary}</h3>
                        {entry.description && (
                          <p className="text-sm text-gray-700 mb-2">{entry.description}</p>
                        )}

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          {entry.goalTitle && (
                            <span className="inline-flex items-center gap-1 badge badge-info">
                              <Target className="w-3 h-3" />
                              {entry.goalTitle}
                            </span>
                          )}
                          <span className={`badge ${
                            entry.status === 'completed' ? 'badge-success' :
                            entry.status === 'failed' ? 'badge-error' :
                            'badge-neutral'
                          }`}>
                            {entry.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {entry.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {entry.status === 'in_progress' && <Clock className="w-3 h-3 mr-1" />}
                            {entry.status}
                          </span>
                          <span className="text-gray-500">{entry.type}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timestamp & Agent */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-600 font-medium">
                        {entry.agentName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  {entry.details && Object.keys(entry.details).length > 0 && (
                    <>
                      <button
                        onClick={() => toggleExpanded(entry.id)}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
                      >
                        {expandedItems.has(entry.id) ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Show Details
                          </>
                        )}
                      </button>
                      {expandedItems.has(entry.id) && renderDetails(entry)}
                    </>
                  )}

                  {/* Screenshot */}
                  {entry.screenshotUrl && (
                    <div className="mt-4 pt-4 border-t border-white/40">
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-3 font-medium">
                        <ImageIcon size={16} />
                        <span>Screenshot captured</span>
                      </div>
                      <img
                        src={entry.screenshotUrl}
                        alt="Screenshot"
                        className="rounded-xl border-2 border-white/60 shadow-lg max-w-full hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--mint-dark)' }} />
        <span>Live updates enabled</span>
      </div>
    </div>
  );
}

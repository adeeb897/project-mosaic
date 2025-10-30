/**
 * Kanban-style Goals View - Drag and drop goals between agents
 */
'use client';

import { useState, useEffect } from 'react';
import { Target, Plus, Users, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { RealtimeEvent } from '@/hooks/useWebSocket';

interface Goal {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo?: string;
  parentGoalId?: string;
  childGoalIds: string[];
}

interface Agent {
  id: string;
  name: string;
  status: string;
}

interface GoalsKanbanProps {
  realtimeEvents: RealtimeEvent[];
}

export function GoalsKanban({ realtimeEvents }: GoalsKanbanProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedGoal, setDraggedGoal] = useState<Goal | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGoalData, setNewGoalData] = useState({
    title: '',
    description: '',
    priority: 'medium',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const latestEvent = realtimeEvents[0];
    if (latestEvent?.type?.includes('goal') || latestEvent?.type?.includes('agent')) {
      fetchData();
    }
  }, [realtimeEvents]);

  const fetchData = async () => {
    try {
      const [goalsRes, agentsRes] = await Promise.all([
        axios.get(getApiUrl('/api/goals')),
        axios.get(getApiUrl('/api/agents')),
      ]);
      setGoals(goalsRes.data.data);
      setAgents(agentsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async () => {
    if (!newGoalData.title || !newGoalData.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await axios.post(getApiUrl('/api/goals'), {
        ...newGoalData,
        createdBy: 'user',
      });
      setShowCreateModal(false);
      setNewGoalData({ title: '', description: '', priority: 'medium' });
      await fetchData();
    } catch (error: any) {
      alert(`Failed to create goal: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDragStart = (e: React.DragEvent, goal: Goal) => {
    setDraggedGoal(goal);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, agentId: string | null) => {
    e.preventDefault();
    if (!draggedGoal) return;

    try {
      // If dropping to unassigned
      if (agentId === null) {
        if (draggedGoal.assignedTo) {
          await axios.delete(getApiUrl(`/api/agents/${draggedGoal.assignedTo}/goals/${draggedGoal.id}`));
        }
      } else {
        // If goal is currently assigned to different agent, unassign first
        if (draggedGoal.assignedTo && draggedGoal.assignedTo !== agentId) {
          await axios.delete(getApiUrl(`/api/agents/${draggedGoal.assignedTo}/goals/${draggedGoal.id}`));
        }

        // Assign to new agent
        if (draggedGoal.assignedTo !== agentId) {
          await axios.post(getApiUrl(`/api/agents/${agentId}/goals`), { goalId: draggedGoal.id });
        }
      }

      await fetchData();
    } catch (error: any) {
      alert(`Failed to assign goal: ${error.response?.data?.error || error.message}`);
    } finally {
      setDraggedGoal(null);
    }
  };

  const getGoalsForAgent = (agentId: string | null) => {
    // Only return root goals (no parent)
    return goals.filter((goal) =>
      !goal.parentGoalId &&
      (agentId === null ? !goal.assignedTo : goal.assignedTo === agentId)
    );
  };

  const getChildGoals = (parentId: string): Goal[] => {
    return goals.filter((goal) => goal.parentGoalId === parentId);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'border-l-red-500',
      high: 'border-l-orange-500',
      medium: 'border-l-yellow-500',
      low: 'border-l-green-500',
    };
    return colors[priority] || 'border-l-gray-500';
  };

  const getAgentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      running: 'bg-green-500',
      idle: 'bg-gray-400',
      error: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-400';
  };

  const GoalCard = ({ goal, depth = 0 }: { goal: Goal; depth?: number }) => {
    const children = getChildGoals(goal.id);
    const hasChildren = children.length > 0;

    return (
      <div className="space-y-2">
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, goal)}
          className={`bg-white rounded-lg border-l-4 ${getPriorityColor(goal.priority)} border-r border-t border-b border-gray-200 p-3 cursor-move hover:shadow-md transition-all group`}
          style={{ marginLeft: depth > 0 ? `${depth * 16}px` : '0' }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1">
              {depth > 0 && <span className="text-gray-400 text-xs">└─</span>}
              <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1">{goal.title}</h4>
            </div>
            <div className="flex items-center gap-2">
              {hasChildren && (
                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {children.length}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(goal.status)}`}>
                {goal.status}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-600 line-clamp-2">{goal.description}</p>
        </div>

        {/* Render children recursively */}
        {hasChildren && (
          <div className="space-y-2">
            {children.map((childGoal) => (
              <GoalCard key={childGoal.id} goal={childGoal} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const Column = ({ title, agentId, agent }: { title: string; agentId: string | null; agent?: Agent }) => {
    const columnGoals = getGoalsForAgent(agentId);

    return (
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, agentId)}
        className="bg-gray-50 rounded-xl p-4 flex flex-col min-h-[500px]"
      >
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
          {agent ? (
            <>
              <div className={`w-2 h-2 rounded-full ${getAgentStatusColor(agent.status)}`} />
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <span className="text-xs text-gray-500">({columnGoals.length})</span>
            </>
          ) : (
            <>
              <Users size={16} className="text-gray-600" />
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <span className="text-xs text-gray-500">({columnGoals.length})</span>
            </>
          )}
        </div>

        <div className="space-y-2 flex-1">
          {columnGoals.length === 0 ? (
            <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-xs text-gray-400">Drop goals here</p>
            </div>
          ) : (
            columnGoals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Goals Board</h2>
            <p className="text-sm text-gray-600">Drag goals between agents to assign them</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          New Goal
        </button>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: `${(agents.length + 1) * 320}px` }}>
          {/* Unassigned Column */}
          <div className="w-80 flex-shrink-0">
            <Column title="Unassigned" agentId={null} />
          </div>

          {/* Agent Columns */}
          {agents.map((agent) => (
            <div key={agent.id} className="w-80 flex-shrink-0">
              <Column title={agent.name} agentId={agent.id} agent={agent} />
            </div>
          ))}

          {agents.length === 0 && (
            <div className="w-80 flex-shrink-0">
              <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-300 min-h-[500px] flex items-center justify-center">
                <div>
                  <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No agents yet</p>
                  <p className="text-xs text-gray-400 mt-2">Create agents to organize goals</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Goal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-green-50 to-teal-50 px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-lg">Create New Goal</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Goal Title *</label>
                <input
                  type="text"
                  value={newGoalData.title}
                  onChange={(e) => setNewGoalData({ ...newGoalData, title: e.target.value })}
                  placeholder="e.g., Implement user authentication"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                <textarea
                  value={newGoalData.description}
                  onChange={(e) => setNewGoalData({ ...newGoalData, description: e.target.value })}
                  placeholder="Detailed description..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                <select
                  value={newGoalData.priority}
                  onChange={(e) => setNewGoalData({ ...newGoalData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-2 justify-end rounded-b-xl">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewGoalData({ title: '', description: '', priority: 'medium' });
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createGoal}
                disabled={!newGoalData.title || !newGoalData.description}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

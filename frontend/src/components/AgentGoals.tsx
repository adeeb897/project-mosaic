/**
 * Agent Goals Management - View and assign goals to agents
 */
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { X, Target, Plus, Trash2, Play, AlertCircle, CheckCircle } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
}

interface AgentGoalsProps {
  agentId: string;
  agentName: string;
  agentStatus: string;
  onClose: () => void;
  onRefresh?: () => void;
}

export function AgentGoals({ agentId, agentName, agentStatus, onClose, onRefresh }: AgentGoalsProps) {
  const [agentGoals, setAgentGoals] = useState<Goal[]>([]);
  const [availableGoals, setAvailableGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [newGoalData, setNewGoalData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'critical' | 'high' | 'medium' | 'low',
  });

  useEffect(() => {
    fetchAgentGoals();
    fetchAvailableGoals();
  }, [agentId]);

  const fetchAgentGoals = async () => {
    try {
      const response = await axios.get(getApiUrl(`/api/agents/${agentId}/goals`));
      setAgentGoals(response.data.data);
    } catch (error) {
      console.error('Failed to fetch agent goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableGoals = async () => {
    try {
      const response = await axios.get(getApiUrl('/api/goals'));
      // Filter out goals already assigned to this agent and only show pending/in_progress goals
      const unassigned = response.data.data.filter(
        (goal: Goal) =>
          (!goal.assignedTo || goal.assignedTo !== agentId) &&
          (goal.status === 'pending' || goal.status === 'in_progress')
      );
      setAvailableGoals(unassigned);
    } catch (error) {
      console.error('Failed to fetch available goals:', error);
    }
  };

  const createGoal = async () => {
    if (!newGoalData.title || !newGoalData.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Create the goal
      const createResponse = await axios.post(getApiUrl('/api/goals'), {
        ...newGoalData,
        createdBy: 'user',
      });
      const newGoal = createResponse.data.data;

      // Automatically assign it to this agent
      await axios.post(getApiUrl(`/api/agents/${agentId}/goals`), { goalId: newGoal.id });

      // Refresh and close
      await fetchAgentGoals();
      await fetchAvailableGoals();
      setShowCreateModal(false);
      setNewGoalData({ title: '', description: '', priority: 'medium' });
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(`Failed to create goal: ${error.response?.data?.error || error.message}`);
    }
  };

  const assignGoal = async (goalId: string) => {
    try {
      await axios.post(getApiUrl(`/api/agents/${agentId}/goals`), { goalId });
      await fetchAgentGoals();
      await fetchAvailableGoals();
      setShowAssignModal(false);
      setSelectedGoal(null);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(`Failed to assign goal: ${error.response?.data?.error || error.message}`);
    }
  };

  const unassignGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to unassign this goal?')) return;

    try {
      await axios.delete(getApiUrl(`/api/agents/${agentId}/goals/${goalId}`));
      await fetchAgentGoals();
      await fetchAvailableGoals();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(`Failed to unassign goal: ${error.response?.data?.error || error.message}`);
    }
  };

  const startWithGoal = async (goalId: string) => {
    try {
      await axios.post(getApiUrl(`/api/agents/${agentId}/goals/${goalId}/start`));
      if (onRefresh) onRefresh();
      onClose();
    } catch (error: any) {
      alert(`Failed to start agent: ${error.response?.data?.error || error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{agentName}</h2>
              <p className="text-sm text-gray-600">Goal Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Create Goal
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Assign Existing
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
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading goals...</p>
            </div>
          ) : agentGoals.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
              <Target size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No goals assigned to this agent</p>
              <p className="text-sm text-gray-400 mt-2">Use the buttons above to create or assign goals</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agentGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="bg-gradient-to-br from-purple-50 to-blue-50 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusColor(goal.status)}`}>
                          {goal.status}
                        </span>
                        <span className={`text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                          {goal.priority} priority
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                      <p className="text-xs text-gray-500">ID: {goal.id}</p>
                    </div>
                    <div className="flex gap-2">
                      {agentStatus !== 'running' && goal.status !== 'completed' && (
                        <button
                          onClick={() => startWithGoal(goal.id)}
                          className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          title="Start agent with this goal"
                        >
                          <Play size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => unassignGoal(goal.id)}
                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        title="Unassign goal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Goal Modal */}
        {showCreateModal && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
              <div className="bg-gradient-to-r from-green-50 to-teal-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Create New Goal for {agentName}</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewGoalData({ title: '', description: '', priority: 'medium' });
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-4">
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
                    placeholder="Detailed description of what needs to be accomplished..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                  <select
                    value={newGoalData.priority}
                    onChange={(e) => setNewGoalData({ ...newGoalData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2 justify-end">
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
                  Create & Assign
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Goal Modal */}
        {showAssignModal && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[70vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Assign Goal to {agentName}</h3>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedGoal(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                {availableGoals.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No available goals to assign</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableGoals.map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() => setSelectedGoal(goal.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedGoal === goal.id
                            ? 'border-purple-400 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{goal.title}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusColor(goal.status)}`}>
                            {goal.status}
                          </span>
                          <span className={`text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                            {goal.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{goal.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedGoal(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectedGoal && assignGoal(selectedGoal)}
                  disabled={!selectedGoal}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign Goal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

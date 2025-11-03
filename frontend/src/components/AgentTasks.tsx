/**
 * AgentTasks - Manage tasks for a specific agent
 */
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { X, Plus, Target, Play, Trash2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
}

interface AgentTasksProps {
  agentId: string;
  agentName: string;
  agentStatus: string;
  onClose: () => void;
  onRefresh: () => void;
}

export function AgentTasks({
  agentId,
  agentName,
  agentStatus,
  onClose,
  onRefresh,
}: AgentTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    priority: 'medium',
  });

  useEffect(() => {
    fetchAgentTasks();
    fetchAllTasks();
  }, [agentId]);

  const fetchAgentTasks = async () => {
    try {
      const response = await axios.get(getApiUrl(`/api/agents/${agentId}/tasks`));
      setTasks(response.data.data);
    } catch (error) {
      console.error('Failed to fetch agent tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTasks = async () => {
    try {
      const response = await axios.get(getApiUrl('/api/tasks'));
      setAllTasks(
        response.data.data.filter((t: Task) => !t.assignedTo || t.assignedTo === agentId)
      );
    } catch (error) {
      console.error('Failed to fetch all tasks:', error);
    }
  };

  const createTask = async () => {
    if (!newTaskData.title || !newTaskData.description) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const createResponse = await axios.post(getApiUrl('/api/tasks'), {
        ...newTaskData,
        createdBy: 'user',
      });
      const newTask = createResponse.data.data;

      // Assign to this agent
      await axios.post(getApiUrl(`/api/agents/${agentId}/tasks`), { taskId: newTask.id });

      setShowCreateModal(false);
      setNewTaskData({ title: '', description: '', priority: 'medium' });
      await fetchAgentTasks();
      await fetchAllTasks();
      onRefresh();
    } catch (error: any) {
      alert(`Failed to create task: ${error.response?.data?.error || error.message}`);
    }
  };

  const assignExistingTask = async (taskId: string) => {
    try {
      await axios.post(getApiUrl(`/api/agents/${agentId}/tasks`), { taskId });
      setShowAssignModal(false);
      await fetchAgentTasks();
      await fetchAllTasks();
      onRefresh();
    } catch (error: any) {
      alert(`Failed to assign task: ${error.response?.data?.error || error.message}`);
    }
  };

  const unassignTask = async (taskId: string) => {
    if (!confirm('Unassign this task from the agent?')) return;

    try {
      await axios.delete(getApiUrl(`/api/agents/${agentId}/tasks/${taskId}`));
      await fetchAgentTasks();
      await fetchAllTasks();
      onRefresh();
    } catch (error: any) {
      alert(`Failed to unassign task: ${error.response?.data?.error || error.message}`);
    }
  };

  const startTask = async (taskId: string) => {
    try {
      await axios.post(getApiUrl(`/api/agents/${agentId}/tasks/${taskId}/start`));
      onRefresh();
      onClose();
    } catch (error: any) {
      alert(`Failed to start task: ${error.response?.data?.error || error.message}`);
    }
  };

  const getUnassignedTasks = () => {
    return allTasks.filter((task) => !task.assignedTo);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-700';
      case 'in_progress':
        return 'bg-purple-100 text-purple-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{agentName} - Tasks</h3>
            <p className="text-sm text-gray-500">Manage tasks assigned to this agent</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Create Task
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex-1 bg-purple-500 text-white py-3 rounded-xl font-semibold hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
          >
            <Target size={18} />
            Assign Existing
          </button>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
            <Target size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No tasks assigned to this agent</p>
            <p className="text-sm text-gray-400 mt-2">
              Use the buttons above to create or assign tasks
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{task.title}</h4>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(task.status)}`}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{task.description}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => startTask(task.id)}
                      className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      title="Start this task"
                    >
                      <Play size={16} />
                    </button>
                    <button
                      onClick={() => unassignTask(task.id)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      title="Unassign task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Assign Existing Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold">Assign Existing Task</h4>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {getUnassignedTasks().length === 0 ? (
                <p className="text-gray-500 text-center py-8">No unassigned tasks available</p>
              ) : (
                <div className="space-y-2">
                  {getUnassignedTasks().map((task) => (
                    <div
                      key={task.id}
                      onClick={() => assignExistingTask(task.id)}
                      className="p-4 border border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-semibold text-gray-900">{task.title}</h5>
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create New Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold">Create New Task</h4>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={newTaskData.title}
                    onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Task title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newTaskData.description}
                    onChange={(e) =>
                      setNewTaskData({ ...newTaskData, description: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={4}
                    placeholder="Task description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                  <select
                    value={newTaskData.priority}
                    onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={createTask}
                    className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
                  >
                    Create & Assign
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

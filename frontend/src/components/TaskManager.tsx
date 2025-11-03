/**
 * Task Manager - Create and manage tasks
 */
'use client';

import { useState, useEffect } from 'react';
import { Plus, Target, TrendingUp, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { RealtimeEvent } from '@/hooks/useWebSocket';
import { getApiUrl } from '@/config/api';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  parentTaskId?: string;
  childTaskIds: string[];
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  lastUpdatedAt: string;
}

interface TaskStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  rootTasks: number;
}

interface TaskManagerProps {
  realtimeEvents: RealtimeEvent[];
}

export function TaskManager({ realtimeEvents }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    createdBy: 'user',
  });

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, []);

  useEffect(() => {
    const latestEvent = realtimeEvents[0];
    if (latestEvent?.type === 'task:created' || latestEvent?.type === 'task:updated') {
      fetchTasks();
      fetchStats();
    }
  }, [realtimeEvents]);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(getApiUrl('/api/tasks'));
      setTasks(response.data.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(getApiUrl('/api/tasks/stats'));
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const createTask = async () => {
    try {
      await axios.post(getApiUrl('/api/tasks'), formData);
      setShowCreateForm(false);
      setFormData({ title: '', description: '', priority: 'medium', createdBy: 'user' });
      fetchTasks();
      fetchStats();
    } catch (error: any) {
      alert(`Failed to create task: ${error.response?.data?.error || error.message}`);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} className="text-green-600" />;
      case 'in_progress':
        return <Clock size={16} className="text-blue-600" />;
      case 'failed':
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <Target size={16} className="text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
          <p className="text-gray-600 mt-1">Create and manage agent tasks</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Create Task
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <Target className="text-gray-400" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {stats.byStatus.in_progress || 0}
                </p>
              </div>
              <TrendingUp className="text-blue-400" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {stats.byStatus.completed || 0}
                </p>
              </div>
              <CheckCircle2 className="text-green-400" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {stats.byStatus.failed || 0}
                </p>
              </div>
              <AlertCircle className="text-red-400" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Research climate change solutions"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what needs to be accomplished..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value as Task['priority'] })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={createTask}
                disabled={!formData.title || !formData.description}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="grid gap-4">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(task.status)}
                  <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                </div>
                <p className="text-gray-600 mb-3">{task.description}</p>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {task.status}
                  </span>
                  {task.childTaskIds.length > 0 && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {task.childTaskIds.length} sub-tasks
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No tasks found. Create a task to get started!</p>
        </div>
      )}
    </div>
  );
}

/**
 * TaskBoard - Kanban-style task management with full CRUD
 * Tasks are independent and can be created, edited, deleted, and assigned to agents
 */
'use client';

import { useState, useEffect } from 'react';
import { Target, Plus, Edit, Trash2, X, CheckCircle, Play, Activity } from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { RealtimeEvent } from '@/hooks/useWebSocket';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo?: string;
  parentTaskId?: string;
  childTaskIds: string[];
  tags: string[];
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
  status: string;
  rootTaskId?: string;
}

interface TaskBoardProps {
  realtimeEvents: RealtimeEvent[];
  onTaskClick?: (taskId: string) => void;
}

export function TaskBoard({ realtimeEvents, onTaskClick }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    tags: '',
  });

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const latestEvent = realtimeEvents[0];
    if (latestEvent?.type?.includes('task') || latestEvent?.type?.includes('agent')) {
      fetchData();
    }
  }, [realtimeEvents]);

  const fetchData = async () => {
    try {
      const [tasksRes, agentsRes] = await Promise.all([
        axios.get(getApiUrl('/api/tasks')),
        axios.get(getApiUrl('/api/agents')),
      ]);
      setTasks(tasksRes.data.data);
      setAgents(agentsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    if (!newTaskData.title || !newTaskData.description) {
      alert('Please fill in title and description');
      return;
    }

    try {
      await axios.post(getApiUrl('/api/tasks'), {
        title: newTaskData.title,
        description: newTaskData.description,
        priority: newTaskData.priority,
        tags: newTaskData.tags ? newTaskData.tags.split(',').map(t => t.trim()) : [],
        createdBy: 'user',
      });
      setShowCreateModal(false);
      setNewTaskData({ title: '', description: '', priority: 'medium', tags: '' });
      await fetchData();
    } catch (error: any) {
      alert(`Failed to create task: ${error.response?.data?.error || error.message}`);
    }
  };

  const updateTask = async () => {
    if (!editingTask) return;

    try {
      await axios.patch(getApiUrl(`/api/tasks/${editingTask.id}`), {
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        tags: editingTask.tags,
      });
      setShowEditModal(false);
      setEditingTask(null);
      await fetchData();
    } catch (error: any) {
      alert(`Failed to update task: ${error.response?.data?.error || error.message}`);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await axios.delete(getApiUrl(`/api/tasks/${taskId}`));
      await fetchData();
    } catch (error: any) {
      alert(`Failed to delete task: ${error.response?.data?.error || error.message}`);
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask({ ...task });
    setShowEditModal(true);
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, agentId: string | null) => {
    e.preventDefault();
    if (!draggedTask) return;

    try {
      // If dropping to unassigned
      if (agentId === null) {
        if (draggedTask.assignedTo) {
          await axios.delete(getApiUrl(`/api/agents/${draggedTask.assignedTo}/tasks/${draggedTask.id}`));
        }
      } else {
        // Unassign from old agent if needed
        if (draggedTask.assignedTo && draggedTask.assignedTo !== agentId) {
          await axios.delete(getApiUrl(`/api/agents/${draggedTask.assignedTo}/tasks/${draggedTask.id}`));
        }
        // Assign to new agent
        await axios.post(getApiUrl(`/api/agents/${agentId}/tasks`), { taskId: draggedTask.id });
      }

      await fetchData();
    } catch (error: any) {
      alert(`Failed to move task: ${error.response?.data?.error || error.message}`);
    } finally {
      setDraggedTask(null);
    }
  };

  const getTasksForAgent = (agentId: string | null): Task[] => {
    return tasks.filter(task => {
      if (agentId === null) {
        return !task.assignedTo && !task.parentTaskId;
      }
      return task.assignedTo === agentId && !task.parentTaskId;
    });
  };

  const getChildTasks = (parentId: string): Task[] => {
    return tasks.filter(task => task.parentTaskId === parentId);
  };

  // Find the currently active task for an agent (any task in_progress assigned to them)
  const getActiveTaskForAgent = (agentId: string): Task | undefined => {
    return tasks.find(task => task.assignedTo === agentId && task.status === 'in_progress');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500';
      case 'high': return 'border-orange-500';
      case 'medium': return 'border-yellow-500';
      case 'low': return 'border-green-500';
      default: return 'border-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-purple-100 text-purple-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'blocked': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const TaskCard = ({ task, depth = 0 }: { task: Task; depth?: number }) => {
    const children = getChildTasks(task.id);
    const hasChildren = children.length > 0;

    return (
      <div className="space-y-2">
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, task)}
          className={`bg-white rounded-lg border-l-4 ${getPriorityColor(task.priority)} p-3 shadow-sm hover:shadow-md transition-shadow cursor-move`}
          style={{ marginLeft: depth > 0 ? `${depth * 16}px` : '0' }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1">
              {depth > 0 && <span className="text-gray-400 text-xs">└─</span>}
              <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">{task.title}</h4>
            </div>
            {hasChildren && (
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {children.length}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-600 line-clamp-2 mb-2">{task.description}</p>

          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(task.status)}`}>
              {task.status.replace('_', ' ')}
            </span>

            <div className="flex gap-1">
              <button
                onClick={() => openEditModal(task)}
                className="p-1 hover:bg-blue-50 rounded text-blue-600"
                title="Edit task"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => deleteTask(task.id)}
                className="p-1 hover:bg-red-50 rounded text-red-600"
                title="Delete task"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.tags.map((tag, idx) => (
                <span key={idx} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Render children recursively */}
        {hasChildren && (
          <div className="space-y-2">
            {children.map((childTask) => (
              <TaskCard key={childTask.id} task={childTask} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Tasks Board</h2>
              <p className="text-gray-600 mt-1">Drag tasks to assign them to agents</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all font-medium shadow-lg hover:shadow-xl"
          >
            <Plus size={18} />
            Create Task
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Unassigned Column */}
        <div
          className="flex-shrink-0 w-80 bg-gray-50 rounded-xl p-4"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, null)}
        >
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-gray-600" />
            <h3 className="font-semibold text-gray-900">Open Tasks</h3>
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
              {getTasksForAgent(null).length}
            </span>
          </div>

          <div className="space-y-3">
            {getTasksForAgent(null).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {getTasksForAgent(null).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No open tasks</p>
            )}
          </div>
        </div>

        {/* Agent Columns */}
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex-shrink-0 w-80 bg-white rounded-xl border-2 border-gray-200 p-4"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, agent.id)}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{agent.name[0]}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                <span className="text-xs text-gray-500">{agent.status}</span>
              </div>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {getTasksForAgent(agent.id).length}
              </span>
            </div>

            <div className="space-y-3">
              {getTasksForAgent(agent.id).map((task) => {
                const activeTask = getActiveTaskForAgent(agent.id);
                const isCurrentlyRunning = activeTask?.id === task.id;
                const canStart = task.status !== 'in_progress' && task.status !== 'completed';

                return (
                  <div key={task.id} className="relative group">
                    <TaskCard task={task} />
                    {/* Start button - only show if not currently running and task can be started */}
                    {!isCurrentlyRunning && canStart && (
                      <button
                        onClick={async () => {
                          try {
                            await axios.post(getApiUrl(`/api/agents/${agent.id}/tasks/${task.id}/start`));
                            await fetchData();
                          } catch (error: any) {
                            alert(`Failed to start task: ${error.response?.data?.error || error.message}`);
                          }
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-lg flex items-center gap-1 text-xs font-medium"
                        title={`Start ${agent.name} on this task`}
                      >
                        <Play size={14} />
                        Start
                      </button>
                    )}
                  </div>
                );
              })}
              {getTasksForAgent(agent.id).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No tasks assigned</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Create New Task</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTaskData.title}
                  onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                  placeholder="e.g., Research market trends"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newTaskData.description}
                  onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                  placeholder="Describe what needs to be done..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newTaskData.tags}
                  onChange={(e) => setNewTaskData({ ...newTaskData, tags: e.target.value })}
                  placeholder="e.g., research, urgent, marketing"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={createTask}
                  className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
                >
                  Create Task
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

      {/* Edit Modal */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit Task</h3>
              <button
                onClick={() => setShowEditModal(false)}
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
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={editingTask.description}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                <select
                  value={editingTask.priority}
                  onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={editingTask.tags?.join(', ') || ''}
                  onChange={(e) => setEditingTask({
                    ...editingTask,
                    tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    if (onTaskClick) {
                      onTaskClick(editingTask.id);
                      setShowEditModal(false);
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-purple-400 to-blue-400 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Activity size={18} />
                  View Activity
                </button>
                <button
                  onClick={updateTask}
                  className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Save Changes
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
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
  );
}

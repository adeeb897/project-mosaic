/**
 * Goal Tree Visualization - Interactive hierarchy view
 */
'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Target, CheckCircle2, Clock, AlertCircle, Circle, Trash2 } from 'lucide-react';
import axios from 'axios';
import { RealtimeEvent } from '@/hooks/useWebSocket';
import { getApiUrl } from '@/config/api';

interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  strategy?: string;
  childGoalIds: string[];
}

interface GoalTreeNode {
  goal: Goal;
  children: GoalTreeNode[];
  depth: number;
}

interface GoalTreeProps {
  realtimeEvents: RealtimeEvent[];
}

export function GoalTree({ realtimeEvents }: GoalTreeProps) {
  const [rootGoals, setRootGoals] = useState<Goal[]>([]);
  const [trees, setTrees] = useState<GoalTreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRootGoals();
  }, []);

  useEffect(() => {
    const latestEvent = realtimeEvents[0];
    if (latestEvent?.type === 'goal:created' || latestEvent?.type === 'goal:updated') {
      fetchRootGoals();
    }
  }, [realtimeEvents]);

  const fetchRootGoals = async () => {
    try {
      const response = await axios.get(getApiUrl('/api/goals/roots'));
      const roots = response.data.data;
      setRootGoals(roots);

      // Fetch trees for each root
      const treePromises = roots.map((root: Goal) =>
        axios.get(getApiUrl(`/api/goals/${root.id}/tree`))
      );
      const treeResponses = await Promise.all(treePromises);
      setTrees(treeResponses.map((r) => r.data.data).filter(Boolean));

      // Expand all root nodes by default
      setExpandedNodes(new Set(roots.map((r: Goal) => r.id)));
    } catch (error) {
      console.error('Failed to fetch goal trees:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (goalId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedNodes(newExpanded);
  };

  const deleteGoal = async (goalId: string, goalTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${goalTitle}"?`)) {
      return;
    }

    try {
      await axios.delete(getApiUrl(`/api/goals/${goalId}`));
      // Refresh the tree
      await fetchRootGoals();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete goal';
      alert(errorMessage);
      console.error('Failed to delete goal:', error);
    }
  };

  const canDeleteGoal = (status: Goal['status']) => {
    return status !== 'in_progress' && status !== 'blocked';
  };

  const getStatusIcon = (status: Goal['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={18} className="text-green-600" />;
      case 'in_progress':
        return <Clock size={18} className="text-blue-600" />;
      case 'failed':
        return <AlertCircle size={18} className="text-red-600" />;
      case 'pending':
        return <Circle size={18} className="text-gray-400" />;
      default:
        return <Target size={18} className="text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: Goal['priority']) => {
    switch (priority) {
      case 'critical':
        return 'border-l-4 border-red-500';
      case 'high':
        return 'border-l-4 border-orange-500';
      case 'medium':
        return 'border-l-4 border-yellow-500';
      case 'low':
        return 'border-l-4 border-gray-400';
    }
  };

  const renderTree = (node: GoalTreeNode): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.goal.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.goal.id} className="ml-0">
        {/* Node */}
        <div
          className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 hover:shadow-md transition-shadow ${getPriorityColor(node.goal.priority)}`}
        >
          <div className="flex items-start gap-3">
            {/* Expand/Collapse Button */}
            {hasChildren && (
              <button
                onClick={() => toggleNode(node.goal.id)}
                className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown size={20} className="text-gray-600" />
                ) : (
                  <ChevronRight size={20} className="text-gray-600" />
                )}
              </button>
            )}

            {/* Status Icon */}
            <div className="flex-shrink-0 mt-0.5">{getStatusIcon(node.goal.status)}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{node.goal.title}</h3>

                {/* Delete Button */}
                {canDeleteGoal(node.goal.status) && (
                  <button
                    onClick={() => deleteGoal(node.goal.id, node.goal.title)}
                    className="flex-shrink-0 p-1.5 hover:bg-red-50 rounded transition-colors text-gray-400 hover:text-red-600"
                    title="Delete goal"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <p className="text-sm text-gray-600 mt-1">{node.goal.description}</p>

              {/* Strategy */}
              {node.goal.strategy && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-900">
                  <span className="font-medium">Strategy:</span> {node.goal.strategy}
                </div>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                  {node.goal.status}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                  Priority: {node.goal.priority}
                </span>
                {hasChildren && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {node.children.length} sub-goal{node.children.length !== 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                  Depth: {node.depth}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="ml-8 border-l-2 border-gray-200 pl-4">
            {node.children.map((child) => renderTree(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Goal Hierarchy</h2>
        <p className="text-gray-600 mt-1">
          Visualize how complex goals are broken down into manageable sub-goals
        </p>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-600" />
            <span className="text-sm text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
            <span className="text-sm text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle size={18} className="text-gray-400" />
            <span className="text-sm text-gray-600">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600" />
            <span className="text-sm text-gray-600">Failed</span>
          </div>
        </div>
      </div>

      {/* Trees */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Loading goal trees...</p>
        </div>
      ) : trees.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <Target size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            No goal hierarchies yet. Create an agent with a complex goal to see the tree!
          </p>
        </div>
      ) : (
        <div className="space-y-6">{trees.map((tree) => renderTree(tree))}</div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Tip:</strong> Click the chevron icons to expand or collapse goal hierarchies.
          The left border color indicates priority level.
        </p>
      </div>
    </div>
  );
}

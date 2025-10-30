/**
 * Admin Dashboard - Main Page
 * Beautiful pastel-themed interface
 */
'use client';

import { useState } from 'react';
import { AgentManager } from '@/components/AgentManager';
import { GoalsView } from '@/components/GoalsView';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Users, Target, Activity, Sparkles } from 'lucide-react';

type Tab = 'agents' | 'goals' | 'activity';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('agents');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const { isConnected, events } = useWebSocket();

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'agents', label: 'Agents', icon: <Users size={18} /> },
    { id: 'goals', label: 'Goals & Hierarchy', icon: <Target size={18} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={18} /> },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 via-blue-400 to-green-400 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">Project Mosaic</h1>
                <p className="text-sm text-gray-600">Admin Dashboard</p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl glass">
              <div
                className={`w-3 h-3 rounded-full shadow-lg ${
                  isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}
              />
              <span className="text-sm font-medium text-gray-700">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="glass border-t border-white/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-4 font-semibold text-sm rounded-t-2xl
                  transition-all duration-300 relative
                  ${
                    activeTab === tab.id
                      ? 'bg-white/90 shadow-lg text-gray-900 -mb-px'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-blue-400 to-green-400 rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'agents' && (
            <AgentManager
              onSessionSelect={(sessionId) => {
                setSelectedSessionId(sessionId);
                setActiveTab('activity');
              }}
              realtimeEvents={events}
            />
          )}
          {activeTab === 'goals' && <GoalsView realtimeEvents={events} />}
          {activeTab === 'activity' && (
            <>
              {selectedSessionId ? (
                <ActivityTimeline
                  sessionId={selectedSessionId}
                  realtimeEvents={events}
                />
              ) : (
                <div className="card text-center py-16">
                  <Activity className="w-20 h-20 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg mb-2">No session selected</p>
                  <p className="text-gray-400 text-sm">
                    Select an agent from the Agents tab to view its activity
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">
            Project Mosaic v2.0 - Autonomous AI Agent Platform
          </p>
        </div>
      </footer>
    </div>
  );
}

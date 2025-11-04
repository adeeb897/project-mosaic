/**
 * Agent Chat Card - Interactive agent card with chat interface
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Play, Square, Trash2, Bot, Monitor, Loader2, Download } from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '@/config/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  config: {
    llmProvider?: string;
    model?: string;
    llm?: {
      provider: string;
      model: string;
    };
  };
}

interface AgentChatCardProps {
  agent: Agent;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  currentTask?: { id: string; title: string };
  browserScreenshot?: string;
}

export function AgentChatCard({
  agent,
  onStart,
  onStop,
  onDelete,
  onExport,
  currentTask,
  browserScreenshot,
}: AgentChatCardProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setSending(true);

    try {
      // TODO: Implement actual API endpoint for agent messaging
      const response = await axios.post(`${getApiUrl()}/agents/${agent.id}/message`, {
        message: inputValue,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.reply || 'Message received.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Failed to send message. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const statusColor = {
    running: 'bg-green-100 text-green-700',
    idle: 'bg-gray-100 text-gray-700',
    stopped: 'bg-red-100 text-red-700',
    error: 'bg-orange-100 text-orange-700',
  }[agent.status] || 'bg-gray-100 text-gray-700';

  const model = agent.config.llm?.model || agent.config.model || 'Unknown';
  const provider = agent.config.llm?.provider || agent.config.llmProvider || 'Unknown';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">{agent.name}</h3>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {agent.status}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>{provider}</span>
          <span>•</span>
          <span>{model}</span>
        </div>

        {currentTask && (
          <div className="mt-2 text-xs text-gray-600 bg-white/50 rounded px-2 py-1">
            Task: {currentTask.title}
          </div>
        )}
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex min-h-0">
        {/* Chat History - Left Side */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No messages yet. Start a conversation!
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || sending}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Browser Screenshot - Right Side (if available) */}
        {browserScreenshot && (
          <div className="w-64 border-l border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-gray-700">
              <Monitor className="w-4 h-4" />
              <span>Browser View</span>
            </div>
            <img
              src={browserScreenshot}
              alt="Browser screenshot"
              className="w-full rounded border border-gray-200"
            />
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex gap-2">
        {agent.status === 'running' ? (
          <button
            onClick={() => onStop(agent.id)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
          >
            <Square className="w-4 h-4" />
            Stop
          </button>
        ) : (
          <button
            onClick={() => onStart(agent.id)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            Start
          </button>
        )}
        <button
          onClick={() => onExport(agent.id)}
          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          title="Export agent"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(agent.id)}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

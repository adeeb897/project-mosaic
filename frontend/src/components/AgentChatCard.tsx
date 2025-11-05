/**
 * Agent Chat Card - Interactive agent card with chat interface
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Play, Square, Trash2, Bot, Monitor, Loader2, Download, Settings } from 'lucide-react';
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
    llm_config: {
      model: string;
      model_endpoint_type?: string;
      context_window?: number;
      temperature?: number;
    };
  };
}

interface AgentChatCardProps {
  agent: Agent;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  onConfig?: (id: string) => void;
  currentTask?: { id: string; title: string };
  browserScreenshot?: string;
}

export function AgentChatCard({
  agent,
  onStart,
  onStop,
  onDelete,
  onExport,
  onConfig,
  currentTask,
  browserScreenshot,
}: AgentChatCardProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        console.log(`[AgentChatCard] Loading messages for agent ${agent.id}`);
        const response = await axios.get(getApiUrl(`/api/agents/${agent.id}/messages`));
        console.log(`[AgentChatCard] Response:`, response.data);

        if (response.data.success && response.data.data.messages) {
          console.log(`[AgentChatCard] Found ${response.data.data.messages.length} messages`);
          // Convert .af format messages to local format
          const convertedMessages: Message[] = response.data.data.messages
            .map((msg: any, index: number) => {
              // Skip system messages entirely (they contain instructions, not conversation)
              if (msg.role === 'system') {
                return null;
              }

              // Skip tool messages (they contain tool responses like {"status": "OK"})
              if (msg.role === 'tool') {
                return null;
              }

              let content: string = '';

              // Handle different content formats
              if (typeof msg.content === 'string') {
                content = msg.content;
              } else if (Array.isArray(msg.content)) {
                // Handle array format: [{"type":"text","text":"..."}]
                const textParts = msg.content
                  .map((item: any) => {
                    if (item.type === 'text' && item.text) {
                      // Check if text is JSON string that needs parsing
                      try {
                        const parsed = JSON.parse(item.text);
                        // Extract message from various formats
                        if (parsed.message) return parsed.message;
                        if (parsed.type === 'user_message' && parsed.message) return parsed.message;
                        // Skip system messages, heartbeat, etc
                        if (parsed.type === 'heartbeat' || parsed.type === 'login' || parsed.status === 'OK') return null;
                        // If it's just metadata, skip it
                        if (parsed.type && !parsed.message) return null;
                        return item.text;
                      } catch {
                        // Not JSON, return as-is
                        return item.text;
                      }
                    }
                    return null;
                  })
                  .filter((text: string | null) => text !== null);

                content = textParts.join('\n').trim();
              } else {
                content = JSON.stringify(msg.content);
              }

              // Skip messages with no meaningful content
              if (!content || content.trim() === '' || content === 'None') {
                return null;
              }

              // For assistant messages, check if they have tool_calls (function calls)
              // These are internal actions, not user-facing messages
              if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
                // Check if the tool call is send_message - only show those
                const sendMessageCall = msg.tool_calls.find((call: any) => call.function?.name === 'send_message');
                if (sendMessageCall) {
                  // Extract the actual message from the send_message function call
                  try {
                    const args = JSON.parse(sendMessageCall.function.arguments);
                    if (args.message) {
                      content = args.message;
                    } else {
                      return null; // No message in send_message call
                    }
                  } catch {
                    return null; // Failed to parse arguments
                  }
                } else {
                  // Not a send_message call, skip this (it's internal tool use)
                  return null;
                }
              }

              return {
                id: `${msg.created_at}-${index}`,
                role: msg.role === 'user' ? 'user' : 'assistant',
                content,
                timestamp: new Date(msg.created_at),
              };
            })
            .filter((msg: Message | null) => msg !== null) as Message[];
          console.log(`[AgentChatCard] Converted messages:`, convertedMessages);
          setMessages(convertedMessages);
        } else {
          console.log(`[AgentChatCard] No messages found or invalid response format`);
        }
      } catch (error) {
        console.error('Failed to load conversation history:', error);
        if (error instanceof Error) {
          console.error('Error details:', error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [agent.id]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const userMessageContent = inputValue;
    setInputValue('');
    setSending(true);

    console.log(`[AgentChatCard] Sending message to agent ${agent.id}:`, userMessageContent);

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await axios.post(getApiUrl(`/api/agents/${agent.id}/message`), {
        message: userMessageContent,
      });
      console.log(`[AgentChatCard] Message response:`, response.data);

      if (response.data.success && response.data.data.message) {
        // Add the assistant's response from the API
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.data.data.message.content,
          timestamp: new Date(response.data.data.message.created_at),
        };

        // Replace temp message with real one and add assistant response
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
          return [
            ...filtered,
            {
              ...tempUserMessage,
              id: `user-${Date.now()}`,
            },
            assistantMessage,
          ];
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      // Check if it's an axios error
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
      }
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
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

  // Get model and provider from llm_config
  const model = agent.config.llm_config.model;
  const modelEndpointType = agent.config.llm_config.model_endpoint_type;
  const provider = modelEndpointType
    ? modelEndpointType.charAt(0).toUpperCase() + modelEndpointType.slice(1) // Capitalize
    : 'Unknown';

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
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading conversation history...
              </div>
            ) : messages.length === 0 ? (
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
        {onConfig && (
          <button
            onClick={() => onConfig(agent.id)}
            className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            title="View configuration"
          >
            <Settings className="w-4 h-4" />
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

/**
 * WebSocket Hook - Real-time event updates
 */
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/config/api';

export interface RealtimeEvent {
  type: string;
  timestamp: string;
  data: any;
}

export function useWebSocket(url: string = API_CONFIG.wsURL) {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const socket = io(url);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('connected', (data) => {
      console.log('Server message:', data.message);
    });

    // Task events
    socket.on('task:created', (data) => {
      addEvent('task:created', data);
    });

    socket.on('task:updated', (data) => {
      addEvent('task:updated', data);
    });

    // Agent events
    socket.on('agent:started', (data) => {
      addEvent('agent:started', data);
    });

    socket.on('agent:stopped', (data) => {
      addEvent('agent:stopped', data);
    });

    socket.on('agent:progress', (data) => {
      addEvent('agent:progress', data);
    });

    socket.on('agent:error', (data) => {
      addEvent('agent:error', data);
    });

    socket.on('agent:completed', (data) => {
      addEvent('agent:completed', data);
    });

    // Action events
    socket.on('action:recorded', (data) => {
      addEvent('action:recorded', data);
    });

    socket.on('action:completed', (data) => {
      addEvent('action:completed', data);
    });

    // Screenshot events
    socket.on('screenshot:captured', (data) => {
      addEvent('screenshot:captured', data);
    });

    function addEvent(type: string, data: any) {
      setEvents((prev) => [
        {
          type,
          timestamp: new Date().toISOString(),
          data,
        },
        ...prev.slice(0, 99), // Keep last 100 events
      ]);
    }

    // Cleanup
    return () => {
      socket.disconnect();
    };
  }, [url]);

  return {
    isConnected,
    events,
    socket: socketRef.current,
  };
}

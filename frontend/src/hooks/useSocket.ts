import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from '../config/env';

// Global socket instance to prevent multiple connections
let globalSocket: Socket | null = null;

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (message: string, sessionId?: string) => void;
  disconnect: () => void;
}

export const useSocket = (): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const serverUrl = config.socketUrl;

  useEffect(() => {
    // Reuse existing socket or create new one
    if (globalSocket && globalSocket.connected) {
      socketRef.current = globalSocket;
      setIsConnected(true);
      return;
    }

    // Create new socket connection only if none exists
    if (!globalSocket) {
      console.log('Creating new socket connection to:', serverUrl);
      globalSocket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: config.socketTimeout,
        forceNew: false,
        autoConnect: true
      });

      // Connection event handlers
      globalSocket.on('connect', () => {
        console.log('Socket connected to:', serverUrl);
        setIsConnected(true);
      });

      globalSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
      });

      globalSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });
    }

    socketRef.current = globalSocket;

    // Don't disconnect on unmount - keep connection alive
    return () => {
      // Only cleanup listeners, keep connection
    };
  }, [serverUrl]);

  const sendMessage = useCallback((message: string, sessionId?: string) => {
    if (socketRef.current && isConnected) {
      console.log('Sending message via socket:', { message, sessionId });
      socketRef.current.emit('message', {
        message,
        sessionId: sessionId || undefined
      });
    } else {
      console.warn('Socket not connected. Cannot send message.', { isConnected, hasSocket: !!socketRef.current });
    }
  }, [isConnected]);

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    disconnect
  };
};

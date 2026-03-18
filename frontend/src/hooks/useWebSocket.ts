// src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';
import { useFleetStore } from '../store/useFleetStore';

export const useWebSocket = (url: string) => {
  const { updateFleet, setConnected, setSelectedAgv } = useFleetStore();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const connect = () => {
      console.log(`🔌 Connecting to WebSocket: ${url}`);
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('✅ WebSocket Connected');
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          updateFleet(data);
        } catch (err) {
          console.error('❌ Failed to parse WebSocket message:', err);
        }
      };

      socket.onclose = () => {
        console.warn('⚠️ WebSocket Disconnected. Retrying in 3s...');
        setConnected(false);
        if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = window.setTimeout(connect, 3000); // Auto-reconnect logic
      };

      socket.onerror = (error) => {
        console.error('🚫 WebSocket Error:', error);
        socket.close();
      };
    };

    connect();

    // Cleanup when the component unmounts
    return () => {
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [url, updateFleet, setConnected, setSelectedAgv]);
};
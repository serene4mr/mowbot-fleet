// src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';
import { useFleetStore } from '../store/useFleetStore';

export const useWebSocket = (url: string) => {
  const { updateFleet, setConnected, setSelectedAgv, selectedAgv } = useFleetStore();
  const socketRef = useRef<WebSocket | null>(null);

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

          // Auto-select the first AGV if nothing is selected yet
          if (!selectedAgv && Object.keys(data).length > 0) {
            setSelectedAgv(Object.keys(data)[0]);
          }
        } catch (err) {
          console.error('❌ Failed to parse WebSocket message:', err);
        }
      };

      socket.onclose = () => {
        console.warn('⚠️ WebSocket Disconnected. Retrying in 3s...');
        setConnected(false);
        setTimeout(connect, 3000); // Auto-reconnect logic
      };

      socket.onerror = (error) => {
        console.error('🚫 WebSocket Error:', error);
        socket.close();
      };
    };

    connect();

    // Cleanup when the component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [url, updateFleet, setConnected, setSelectedAgv, selectedAgv]);

  return socketRef.current;
};
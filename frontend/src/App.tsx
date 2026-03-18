// src/App.tsx
import React from 'react';
import { useFleetStore } from './store/useFleetStore';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  // 1. Start the connection (The Nervous System)
  useWebSocket('ws://localhost:8000/ws/fleet');

  // 2. Read the data (The Brain)
  const { fleet, isConnected } = useFleetStore();

  return (
    <div className="min-h-screen bg-[#0e1117] text-white p-8">
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold text-[#00ff88]">Mowbot Fleet Manager</h1>
        <div className={`flex items-center gap-2 text-sm font-mono ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
          <div className={`w-3 h-3 rounded-full animate-pulse ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          {isConnected ? 'LIVE STREAMING' : 'DISCONNECTED'}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.values(fleet).map((agv) => (
          <div key={agv.serial} className="bg-[#262730] p-6 rounded-xl border border-gray-700 hover:border-[#00ff88] transition-colors">
            <h2 className="text-xl font-bold mb-2">{agv.serial}</h2>
            <div className="space-y-1 text-sm text-gray-400">
              <p>Mode: <span className="text-white">{agv.operating_mode}</span></p>
              <p>Battery: <span className={agv.battery > 20 ? 'text-[#00ff88]' : 'text-red-400'}>{agv.battery}%</span></p>
              <p className="truncate">Lat: {agv.position[1].toFixed(5)}, Lon: {agv.position[0].toFixed(5)}</p>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(fleet).length === 0 && isConnected && (
        <div className="mt-20 text-center text-gray-500 italic">
          Connected to backend. Waiting for HiveMQ telemetry...
        </div>
      )}
    </div>
  );
}

export default App;
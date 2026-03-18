import { Cpu, Map, Route, Settings } from 'lucide-react';
import { useFleetStore } from '../store/useFleetStore';

export default function Sidebar() {
  const { fleet, selectedAgv, setSelectedAgv, isConnected, activePage, setActivePage } =
    useFleetStore();

  const nav = [
    { id: 'fleet' as const, label: 'Fleet', icon: Cpu },
    { id: 'map' as const, label: 'Map', icon: Map },
    { id: 'missions' as const, label: 'Missions', icon: Route },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-80 bg-[#1a1c23] border-r border-gray-800 flex flex-col overflow-hidden">
      <div className="border-b border-gray-800 bg-[#1a1c23]">
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="text-xs tracking-widest uppercase text-gray-400 font-semibold">
            Navigation
          </div>
          <div className={`text-[10px] font-mono ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? 'WS OK' : 'WS DOWN'}
          </div>
        </div>

        <div className="px-4 pb-4 grid grid-cols-4 gap-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 transition-colors ${
                  isActive
                    ? 'border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88]'
                    : 'border-gray-700 bg-[#1a1c23] text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={16} />
                <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {(activePage === 'fleet' || activePage === 'map') && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-xs tracking-widest uppercase text-gray-400 font-semibold px-1">
            Active Robots
          </div>

          {Object.values(fleet).map((agv) => (
            <button
              key={agv.serial}
              type="button"
              onClick={() => setSelectedAgv(agv.serial)}
              className={`w-full text-left p-4 rounded-xl border transition-colors ${
                selectedAgv === agv.serial
                  ? 'border-[#00ff88] bg-[#00ff88]/10'
                  : 'border-gray-700 bg-[#1a1c23] hover:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-base truncate">{agv.serial}</div>
                  <div className="text-xs text-gray-500 truncate">Mode: {agv.operating_mode}</div>
                </div>
                <div
                  className={`text-xs font-bold shrink-0 ${
                    agv.battery > 20 ? 'text-[#00ff88]' : 'text-red-500'
                  }`}
                >
                  {agv.battery}%
                </div>
              </div>
              <div className="mt-2 text-[10px] text-gray-600 font-mono">
                {agv.position[0].toFixed(4)}, {agv.position[1].toFixed(4)}
              </div>
            </button>
          ))}

          {Object.keys(fleet).length === 0 && (
            <div className="text-xs text-gray-500 italic px-1">
              {isConnected ? 'Connected. Waiting for telemetry…' : 'Waiting for backend WebSocket…'}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

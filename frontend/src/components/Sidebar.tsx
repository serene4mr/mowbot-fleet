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
    <aside className="w-80 bg-black/15 border-r border-white/10 backdrop-blur-md flex flex-col overflow-hidden">
      <div className="border-b border-white/10">
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="text-xs tracking-[0.22em] uppercase text-white/55 font-semibold">
            Navigation
          </div>
          <div
            className={`text-xs font-mono tracking-widest ${
              isConnected ? 'text-green-300' : 'text-red-300'
            }`}
          >
            {isConnected ? 'STREAM OK' : 'STREAM DOWN'}
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
                    ? 'border-[#00ff88]/50 bg-[#00ff88]/10 text-[#00ff88] shadow-[0_0_0_1px_rgba(0,255,136,0.18)]'
                    : 'border-white/10 bg-white/0 text-white/75 hover:bg-white/5 hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={16} />
                <span className="text-[11px] font-semibold tracking-wide opacity-90">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {(activePage === 'fleet' || activePage === 'map') && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-xs tracking-[0.22em] uppercase text-white/55 font-semibold px-1">
            Active Robots
          </div>

          {Object.values(fleet).map((agv) => (
            <button
              key={agv.serial}
              type="button"
              onClick={() => setSelectedAgv(agv.serial)}
              className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                selectedAgv === agv.serial
                  ? 'border-[#00ff88]/55 bg-[#00ff88]/10 shadow-[0_0_0_1px_rgba(0,255,136,0.18)]'
                  : 'border-white/10 bg-white/5 hover:bg-white/8'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-black text-[15px] tracking-tight truncate text-white/90">
                    {agv.serial}
                  </div>
                  <div className="text-[12px] text-white/50 truncate">
                    Mode: <span className="text-white/70">{agv.operating_mode}</span>
                  </div>
                </div>
                <div
                  className={`text-sm font-bold shrink-0 ${
                    agv.battery > 20 ? 'text-[#00ff88]' : 'text-red-300'
                  }`}
                >
                  {agv.battery}%
                </div>
              </div>
              <div className="mt-2 text-[11px] text-white/40 font-mono">
                {agv.position[0].toFixed(4)}, {agv.position[1].toFixed(4)}
              </div>
            </button>
          ))}

          {Object.keys(fleet).length === 0 && (
            <div className="text-xs text-white/40 italic px-1">
              {isConnected ? 'Connected. Waiting for telemetry…' : 'Waiting for backend WebSocket…'}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

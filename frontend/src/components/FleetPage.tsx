import { useMemo, useState } from 'react';
import { useFleetStore } from '../store/useFleetStore';
import { apiClient } from '../api/client';

const INSTANT_ACTIONS = [
  { value: 'startPause', label: 'Pause' },
  { value: 'stopPause', label: 'Resume' },
  { value: 'cancelOrder', label: 'Cancel Order' },
  { value: 'startCharging', label: 'Start Charging' },
  { value: 'stopCharging', label: 'Stop Charging' },
] as const;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#11131a] px-4 py-3">
      <div className="text-[10px] tracking-widest uppercase text-gray-500 font-semibold">{label}</div>
      <div className="mt-1 text-sm font-bold text-white">{value}</div>
    </div>
  );
}

export default function FleetPage() {
  const { fleet, selectedAgv } = useFleetStore();
  const agv = useMemo(() => (selectedAgv ? fleet[selectedAgv] : undefined), [fleet, selectedAgv]);

  const [estopStatus, setEstopStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [actionStatus, setActionStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [selectedAction, setSelectedAction] = useState(INSTANT_ACTIONS[0].value);

  if (!agv) {
    return (
      <div className="h-full w-full p-6">
        <div className="rounded-2xl border border-gray-800 bg-[#11131a] p-6">
          <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">Fleet</div>
          <div className="mt-2 text-sm text-gray-300">
            Select a robot from the left panel to see details.
          </div>
        </div>
      </div>
    );
  }

  const lastUpdate = new Date(agv.last_update).toLocaleString();
  const hasErrors = agv.errors?.length > 0;

  const handleEStop = async () => {
    setEstopStatus('sending');
    try {
      await apiClient.post(`/api/fleet/${agv.serial}/emergency-stop`);
      setEstopStatus('done');
    } catch {
      setEstopStatus('error');
    } finally {
      setTimeout(() => setEstopStatus('idle'), 3000);
    }
  };

  const handleInstantAction = async () => {
    setActionStatus('sending');
    try {
      await apiClient.post(`/api/fleet/${agv.serial}/instant-action`, {
        action_type: selectedAction,
        blocking_type: 'HARD',
      });
      setActionStatus('done');
    } catch {
      setActionStatus('error');
    } finally {
      setTimeout(() => setActionStatus('idle'), 3000);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="p-6 space-y-6">

        {/* Header card */}
        <div className="rounded-2xl border border-gray-800 bg-[#11131a] p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">Robot</div>
              <div className="mt-1 text-2xl font-black tracking-tight truncate">{agv.serial}</div>
              <div className="mt-1 text-xs text-gray-400 truncate">
                {agv.manufacturer} · {agv.connection} · {agv.operating_mode}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[10px] tracking-widest uppercase text-gray-500 font-semibold">Battery</div>
              <div className={`mt-1 text-2xl font-black ${agv.battery > 20 ? 'text-[#00ff88]' : 'text-red-500'}`}>
                {agv.battery}%
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Stat label="Last update" value={lastUpdate} />
          <Stat label="Current order" value={agv.current_order ?? '—'} />
          <Stat label="Position" value={`${agv.position[0].toFixed(5)}, ${agv.position[1].toFixed(5)}`} />
          <Stat label="Heading (rad)" value={agv.theta.toFixed(3)} />
        </div>

        {/* Command Panel */}
        <div className="rounded-2xl border border-gray-800 bg-[#11131a] p-6 space-y-4">
          <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">Commands</div>

          {/* E-Stop */}
          <div className="flex items-center gap-4 rounded-xl border border-red-900/40 bg-red-950/20 p-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">Emergency Stop</div>
              <div className="text-xs text-gray-500 mt-0.5">Sends a HARD VDA5050 emergencyStop instant action.</div>
            </div>
            <button
              type="button"
              onClick={handleEStop}
              disabled={estopStatus === 'sending'}
              className="shrink-0 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white transition-opacity disabled:opacity-50 hover:bg-red-500"
            >
              {estopStatus === 'sending' ? 'Sending…' : estopStatus === 'done' ? 'Sent!' : estopStatus === 'error' ? 'Error' : 'E-STOP'}
            </button>
          </div>

          {/* Instant Action */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-[#0e1117] p-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white mb-2">Instant Action</div>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-[#1a1c23] px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]"
              >
                {INSTANT_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleInstantAction}
              disabled={actionStatus === 'sending'}
              className="shrink-0 self-end rounded-xl border border-gray-700 bg-[#1a1c23] px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 hover:bg-gray-700"
            >
              {actionStatus === 'sending' ? 'Sending…' : actionStatus === 'done' ? 'Sent!' : actionStatus === 'error' ? 'Error' : 'Send'}
            </button>
          </div>
        </div>

        {/* Errors & Sensors */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-gray-800 bg-[#11131a] p-6">
            <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">Errors</div>
            <div className="mt-3 space-y-3">
              {!hasErrors && <div className="text-sm text-gray-300">No errors reported.</div>}
              {hasErrors &&
                agv.errors.map((e, idx) => (
                  <div key={`${e.timestamp}-${idx}`} className="rounded-xl border border-gray-800 bg-[#0e1117] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-bold text-white truncate">{e.type}</div>
                      <div className={`text-[10px] font-mono ${e.severity === 'FATAL' ? 'text-red-400' : 'text-yellow-300'}`}>
                        {e.severity}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">{e.description}</div>
                    <div className="mt-2 text-[10px] text-gray-500 font-mono">
                      {new Date(e.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-[#11131a] p-6">
            <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">Sensors</div>
            <div className="mt-3">
              {!agv.sensor_status && <div className="text-sm text-gray-300">No sensor status available.</div>}
              {agv.sensor_status && (
                <div className="space-y-2">
                  {Object.entries(agv.sensor_status).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between rounded-xl border border-gray-800 bg-[#0e1117] px-4 py-3">
                      <div className="text-xs text-gray-400 font-mono truncate">{k}</div>
                      <div className={`text-xs font-semibold ${v === 'OK' ? 'text-[#00ff88]' : v === 'ERROR' ? 'text-red-400' : 'text-yellow-300'}`}>
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

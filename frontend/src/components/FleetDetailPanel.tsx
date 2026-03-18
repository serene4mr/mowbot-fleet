import { useMemo, useState } from 'react';
import { useFleetStore } from '../store/useFleetStore';
import { apiClient } from '../api/client';

const INSTANT_ACTIONS = [
  { value: 'startPause', label: 'Pause' },
  { value: 'stopPause', label: 'Resume' },
  { value: 'cancelOrder', label: 'Cancel Order' },
] as const;

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#11131a] px-5 py-4">
      <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">{label}</div>
      <div className="mt-1 text-base font-bold text-white">{value}</div>
    </div>
  );
}

export default function FleetDetailPanel() {
  const { fleet, selectedAgv } = useFleetStore();
  const agv = useMemo(() => (selectedAgv ? fleet[selectedAgv] : undefined), [fleet, selectedAgv]);

  const [estopStatus, setEstopStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [actionStatus, setActionStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [selectedAction, setSelectedAction] = useState<(typeof INSTANT_ACTIONS)[number]['value']>(INSTANT_ACTIONS[0].value);

  if (!agv) {
    return (
      <div>
        <div className="rounded-2xl border border-gray-800 bg-[#11131a] p-6">
          <div className="text-sm tracking-widest uppercase text-gray-500 font-semibold">Robot</div>
          <div className="mt-2 text-base text-gray-300">
            Select a robot from the list or click one on the map to see details and send commands.
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
    <div className="space-y-5">
      {/* Header card */}
      <div className="rounded-2xl border border-gray-800 bg-[#11131a] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">Robot</div>
            <div className="mt-1 text-xl font-black tracking-tight truncate">{agv.serial}</div>
            <div className="mt-0.5 text-sm text-gray-400 truncate">
              {agv.manufacturer} · {agv.operating_mode}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">Battery</div>
            <div className={`mt-1 text-xl font-black ${agv.battery > 20 ? 'text-[#00ff88]' : 'text-red-500'}`}>
              {agv.battery}%
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3">
        <Stat label="Last update" value={lastUpdate} />
        <Stat label="Current order" value={agv.current_order ?? '—'} />
        <Stat
          label="Position"
          value={
            <div className="font-mono text-sm leading-5 text-white/90">
              <div><span className="text-white/45">lon</span> {agv.position[0]}</div>
              <div><span className="text-white/45">lat</span> {agv.position[1]}</div>
            </div>
          }
        />
      </div>

      {/* Commands */}
      <div className="rounded-2xl border border-gray-800 bg-[#11131a] p-5 space-y-3">
        <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">Commands</div>

        <div className="flex flex-col gap-3 rounded-xl border border-red-900/40 bg-red-950/20 p-4">
          <div className="text-sm font-bold text-white">Emergency Stop</div>
          <button
            type="button"
            onClick={handleEStop}
            disabled={estopStatus === 'sending'}
            className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-base font-black text-white transition-opacity disabled:opacity-50 hover:bg-red-500"
          >
            {estopStatus === 'sending' ? 'Sending…' : estopStatus === 'done' ? 'Sent!' : estopStatus === 'error' ? 'Error' : 'E-STOP'}
          </button>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#0e1117] p-4 space-y-2">
          <div className="text-sm font-bold text-white">Instant Action</div>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value as (typeof INSTANT_ACTIONS)[number]['value'])}
            className="w-full rounded-lg border border-gray-700 bg-[#1a1c23] px-3 py-2.5 text-base text-white outline-none focus:border-[#00ff88]"
          >
            {INSTANT_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleInstantAction}
            disabled={actionStatus === 'sending'}
            className="w-full rounded-lg border border-gray-700 bg-[#1a1c23] px-4 py-2.5 text-base font-bold text-white transition-colors disabled:opacity-50 hover:bg-gray-700"
          >
            {actionStatus === 'sending' ? 'Sending…' : actionStatus === 'done' ? 'Sent!' : actionStatus === 'error' ? 'Error' : 'Send'}
          </button>
        </div>
      </div>

      {/* Errors */}
      <div className="rounded-2xl border border-gray-800 bg-[#11131a] p-5">
        <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">Errors</div>
        <div className="mt-2 space-y-2">
          {!hasErrors && <div className="text-sm text-gray-300">No errors reported.</div>}
          {hasErrors &&
            agv.errors.map((e, idx) => (
              <div key={`${e.timestamp}-${idx}`} className="rounded-lg border border-gray-800 bg-[#0e1117] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-white truncate">{e.type}</div>
                  <div className={`text-xs font-mono ${e.severity === 'FATAL' ? 'text-red-400' : 'text-yellow-300'}`}>{e.severity}</div>
                </div>
                <div className="mt-0.5 text-sm text-gray-400">{e.description}</div>
              </div>
            ))}
        </div>
      </div>

      {/* Sensors */}
      <div className="rounded-2xl border border-gray-800 bg-[#11131a] p-5">
        <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">Sensors</div>
        <div className="mt-2">
          {!agv.sensor_status && <div className="text-sm text-gray-300">No sensor status.</div>}
          {agv.sensor_status && (
            <div className="space-y-1.5">
              {Object.entries(agv.sensor_status).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0e1117] px-4 py-2.5">
                  <div className="text-sm text-gray-400 font-mono truncate">{k}</div>
                  <div className={`text-sm font-semibold ${v === 'OK' ? 'text-[#00ff88]' : v === 'ERROR' ? 'text-red-400' : 'text-yellow-300'}`}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

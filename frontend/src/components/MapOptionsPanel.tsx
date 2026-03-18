import { useFleetStore } from '../store/useFleetStore';

export default function MapOptionsPanel() {
  const { selectedAgv, showOnlySelectedMowbot, setShowOnlySelectedMowbot } = useFleetStore();

  return (
    <div className="px-6 py-5 space-y-4">
      <div className="text-sm tracking-widest uppercase text-gray-400 font-semibold">
        Map Options
      </div>

      {/* Display filter */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-400">Display</p>
        <label className="flex items-center gap-3 text-sm text-gray-200 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlySelectedMowbot}
            onChange={(e) => setShowOnlySelectedMowbot(e.target.checked)}
            className="h-4 w-4 rounded accent-[#00ff88]"
          />
          Only selected mowbot
        </label>
        {showOnlySelectedMowbot && !selectedAgv && (
          <p className="text-xs text-gray-500">Select a mowbot first.</p>
        )}
      </div>
    </div>
  );
}

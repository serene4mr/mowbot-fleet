import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Trash2, Play, Save, RefreshCw } from 'lucide-react';
import { useFleetStore } from '../store/useFleetStore';
import { apiClient } from '../api/client';
import type { MissionRoute, Waypoint } from '../types/mission';

const STREET_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// ── helpers ──────────────────────────────────────────────────────────────────

function buildWaypointGeoJSON(waypoints: Waypoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: waypoints.map((wp, i) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: wp },
      properties: { index: i + 1 },
    })),
  };
}

function buildLineGeoJSON(waypoints: Waypoint[]) {
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: waypoints,
    },
    properties: {},
  };
}

// ── component ─────────────────────────────────────────────────────────────────

export default function MissionsPage() {
  const { fleet } = useFleetStore();

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routes, setRoutes] = useState<MissionRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  const [routeName, setRouteName] = useState('');
  const [routeDesc, setRouteDesc] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [selectedAgvSerial, setSelectedAgvSerial] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [dispatchError, setDispatchError] = useState('');

  // ── fetch saved routes ──────────────────────────────────────────────────────

  const fetchRoutes = useCallback(async () => {
    setLoadingRoutes(true);
    try {
      const res = await apiClient.get('/api/missions/routes');
      setRoutes(res.data);
    } catch {
      // silently ignore; user will see empty list
    } finally {
      setLoadingRoutes(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  // ── map initialisation ──────────────────────────────────────────────────────

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const container = mapContainer.current;
    const rafId = requestAnimationFrame(() => {
      if (map.current || !container.parentElement) return;

      map.current = new maplibregl.Map({
        container,
        style: STREET_STYLE,
        center: [128.39, 36.14],
        zoom: 15,
      });

      map.current.on('load', () => {
        if (!map.current) return;

        // Line layer
        map.current.addSource('route-line', {
          type: 'geojson',
          data: buildLineGeoJSON([]),
        });
        map.current.addLayer({
          id: 'route-line-layer',
          type: 'line',
          source: 'route-line',
          paint: {
            'line-color': '#00ff88',
            'line-width': 2,
            'line-dasharray': [4, 2],
          },
        });

        // Waypoint dot layer
        map.current.addSource('route-points', {
          type: 'geojson',
          data: buildWaypointGeoJSON([]),
        });
        map.current.addLayer({
          id: 'route-points-layer',
          type: 'circle',
          source: 'route-points',
          paint: {
            'circle-radius': 8,
            'circle-color': '#00ff88',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });
        map.current.addLayer({
          id: 'route-points-label',
          type: 'symbol',
          source: 'route-points',
          layout: {
            'text-field': ['to-string', ['get', 'index']],
            'text-size': 10,
            'text-anchor': 'center',
          },
          paint: { 'text-color': '#0e1117' },
        });
      });

      // Click to add waypoint
      map.current.on('click', (e) => {
        const wp: Waypoint = [e.lngLat.lng, e.lngLat.lat];
        setWaypoints((prev) => [...prev, wp]);
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // ── update map layers when waypoints change ─────────────────────────────────

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const lineSource = map.current.getSource('route-line') as maplibregl.GeoJSONSource | undefined;
    const pointSource = map.current.getSource('route-points') as maplibregl.GeoJSONSource | undefined;

    lineSource?.setData(buildLineGeoJSON(waypoints) as GeoJSON.Feature);
    pointSource?.setData(buildWaypointGeoJSON(waypoints) as GeoJSON.FeatureCollection);
  }, [waypoints]);

  // ── save route ──────────────────────────────────────────────────────────────

  const handleSaveRoute = async () => {
    if (!routeName.trim() || waypoints.length < 2) return;
    setSaveStatus('saving');
    try {
      await apiClient.post('/api/missions/routes', {
        name: routeName.trim(),
        description: routeDesc.trim(),
        waypoints,
      });
      setSaveStatus('saved');
      setRouteName('');
      setRouteDesc('');
      await fetchRoutes();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  // ── load route ──────────────────────────────────────────────────────────────

  const handleLoadRoute = (route: MissionRoute) => {
    setWaypoints(route.waypoints);
    if (map.current && route.waypoints.length > 0) {
      const lngs = route.waypoints.map((w) => w[0]);
      const lats = route.waypoints.map((w) => w[1]);
      map.current.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 60, maxZoom: 18 }
      );
    }
  };

  // ── delete route ────────────────────────────────────────────────────────────

  const handleDeleteRoute = async (id: number) => {
    try {
      await apiClient.delete(`/api/missions/routes/${id}`);
      setRoutes((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // ignore
    }
  };

  // ── dispatch mission ────────────────────────────────────────────────────────

  const handleDispatch = async () => {
    if (!selectedAgvSerial || waypoints.length < 2) return;
    setDispatchStatus('sending');
    setDispatchError('');
    try {
      await apiClient.post(`/api/fleet/${selectedAgvSerial}/order`, { waypoints });
      setDispatchStatus('done');
      setTimeout(() => setDispatchStatus('idle'), 4000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to dispatch';
      setDispatchError(msg);
      setDispatchStatus('error');
      setTimeout(() => setDispatchStatus('idle'), 5000);
    }
  };

  const agvList = Object.values(fleet);

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-full w-full flex overflow-hidden">

      {/* ── Left panel ── */}
      <aside className="w-80 bg-[#1a1c23] border-r border-gray-800 flex flex-col overflow-hidden shrink-0">

        {/* Saved Routes */}
        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">
              Saved Routes
            </div>
            <button
              type="button"
              onClick={fetchRoutes}
              disabled={loadingRoutes}
              className="text-gray-500 hover:text-white transition-colors"
              title="Refresh routes"
            >
              <RefreshCw size={13} className={loadingRoutes ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto">
            {routes.length === 0 && (
              <div className="text-xs text-gray-600 italic">No saved routes yet.</div>
            )}
            {routes.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-gray-700 bg-[#0e1117] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{r.name}</div>
                    {r.description && (
                      <div className="text-[10px] text-gray-500 truncate">{r.description}</div>
                    )}
                    <div className="text-[10px] text-gray-600 mt-1">
                      {r.waypoints.length} waypoints
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleLoadRoute(r)}
                      className="rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 p-1.5 text-[#00ff88] hover:bg-[#00ff88]/20 transition-colors"
                      title="Load route"
                    >
                      <Play size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoute(r.id)}
                      className="rounded-lg bg-red-950/30 border border-red-900/30 p-1.5 text-red-400 hover:bg-red-950/60 transition-colors"
                      title="Delete route"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* New Route Form */}
        <div className="border-b border-gray-800 p-4 space-y-3">
          <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">
            Save Current Route
          </div>
          <input
            type="text"
            placeholder="Route name"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="w-full rounded-xl border border-gray-700 bg-[#0e1117] px-3 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#00ff88] transition-colors"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={routeDesc}
            onChange={(e) => setRouteDesc(e.target.value)}
            className="w-full rounded-xl border border-gray-700 bg-[#0e1117] px-3 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#00ff88] transition-colors"
          />
          <button
            type="button"
            onClick={handleSaveRoute}
            disabled={!routeName.trim() || waypoints.length < 2 || saveStatus === 'saving'}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00ff88] py-2.5 text-sm font-black text-[#0e1117] transition-opacity disabled:opacity-40 hover:opacity-90"
          >
            <Save size={13} />
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save Route'}
          </button>
        </div>

        {/* Dispatch */}
        <div className="p-4 space-y-3">
          <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">
            Dispatch Mission
          </div>

          <select
            value={selectedAgvSerial}
            onChange={(e) => setSelectedAgvSerial(e.target.value)}
            className="w-full rounded-xl border border-gray-700 bg-[#0e1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00ff88]"
          >
            <option value="">— Select AGV —</option>
            {agvList.map((agv) => (
              <option key={agv.serial} value={agv.serial}>
                {agv.serial} ({agv.operating_mode})
              </option>
            ))}
          </select>

          {dispatchError && (
            <div className="text-xs text-red-400 rounded-xl border border-red-900/30 bg-red-950/20 px-3 py-2">
              {dispatchError}
            </div>
          )}

          <button
            type="button"
            onClick={handleDispatch}
            disabled={!selectedAgvSerial || waypoints.length < 2 || dispatchStatus === 'sending'}
            className="w-full rounded-xl bg-[#00ff88] py-2.5 text-sm font-black text-[#0e1117] transition-opacity disabled:opacity-40 hover:opacity-90"
          >
            {dispatchStatus === 'sending' ? 'Dispatching…' : dispatchStatus === 'done' ? 'Dispatched!' : dispatchStatus === 'error' ? 'Error' : 'Dispatch Mission'}
          </button>
        </div>

      </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Waypoint list strip */}
        <div className="border-b border-gray-800 bg-[#1a1c23] px-4 py-3 flex items-center gap-4">
          <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold shrink-0">
            Waypoints ({waypoints.length})
          </div>

          <div className="flex-1 flex gap-2 overflow-x-auto min-w-0">
            {waypoints.length === 0 && (
              <span className="text-xs text-gray-600 italic">
                Click on the map to add waypoints
              </span>
            )}
            {waypoints.map((wp, i) => (
              <div
                key={i}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-gray-700 bg-[#0e1117] px-2.5 py-1.5"
              >
                <span className="text-[10px] text-[#00ff88] font-bold">{i + 1}</span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {wp[0].toFixed(4)}, {wp[1].toFixed(4)}
                </span>
                <button
                  type="button"
                  onClick={() => setWaypoints((prev) => prev.filter((_, j) => j !== i))}
                  className="text-gray-600 hover:text-red-400 transition-colors ml-1"
                  title="Remove waypoint"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {waypoints.length > 0 && (
            <button
              type="button"
              onClick={() => setWaypoints([])}
              className="shrink-0 flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:border-red-900 transition-colors"
            >
              <Trash2 size={11} />
              Clear
            </button>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative min-h-0">
          <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

          {/* Hint overlay */}
          {waypoints.length === 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="rounded-xl border border-gray-700 bg-[#1a1c23]/90 backdrop-blur-sm px-4 py-2.5 text-xs text-gray-400 text-center shadow-2xl">
                Click on the map to place waypoints
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

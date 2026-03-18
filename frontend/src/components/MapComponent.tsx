import React, { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useFleetStore } from '../store/useFleetStore';

const STREET_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
// Free satellite imagery (no API key). Mapbox satellite can be used instead if you have a valid token.
const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    },
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster',
      source: 'esri-satellite',
    },
  ],
};

const MOWBOT_ARROW_SVG =
  '<svg width="30" height="30" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 5 L90 90 L50 70 L10 90 L50 5 Z" fill="#00ff88" stroke="#ffffff" stroke-width="2"/></svg>';

const MOWBOT_ARROW_SELECTED_SVG =
  '<svg width="34" height="34" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
  '<defs>' +
  '<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">' +
  '<feGaussianBlur stdDeviation="3" result="blur"/>' +
  '<feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 0 0 0 1  0 0 0 0 0.53  0 0 0 0.75 0" result="colored"/>' +
  '<feMerge><feMergeNode in="colored"/><feMergeNode in="SourceGraphic"/></feMerge>' +
  '</filter>' +
  '</defs>' +
  '<path d="M50 5 L90 90 L50 70 L10 90 L50 5 Z" fill="#00ff88" stroke="rgba(255,255,255,0.95)" stroke-width="7" filter="url(#glow)"/>' +
  '</svg>';

// Heading conventions vary by robot stack:
// - MapLibre expects degrees where 0° points "north/up" and positive rotates clockwise.
// - Some robotics stacks also use clockwise-positive; others use CCW-positive.
// Adjust the sign/offset here to align frames.
const HEADING_OFFSET_DEG = 180;

function addFleetToMap(map: maplibregl.Map | null, onSelectAgv: (serial: string) => void) {
  if (!map?.getSource('fleet-source')) return;

  const img = new Image(30, 30);
  const imgSelected = new Image(34, 34);
  let loaded = 0;
  const maybeInit = () => {
    loaded += 1;
    if (loaded < 2) return;

    if (!map.hasImage('mowbot-arrow')) {
      map.addImage('mowbot-arrow', img);
    }
    if (!map.hasImage('mowbot-arrow-selected')) {
      map.addImage('mowbot-arrow-selected', imgSelected);
    }
    if (map.getLayer('fleet-layer')) return;

    // Selected robot highlight ring (under the icon)
    map.addLayer({
      id: 'fleet-selected-ring',
      type: 'circle',
      source: 'fleet-source',
      // Start with no match; MapComponent will setFilter based on selectedAgv
      filter: ['==', ['get', 'serial'], '__none__'],
      paint: {
        'circle-radius': 24,
        'circle-color': 'rgba(0, 255, 136, 0.14)',
        'circle-stroke-width': 3,
        'circle-stroke-color': 'rgba(0, 255, 136, 0.95)',
        'circle-blur': 1.05,
      },
    });

    map.addLayer({
      id: 'fleet-layer',
      type: 'symbol',
      source: 'fleet-source',
      layout: {
        'icon-image': 'mowbot-arrow',
        'icon-rotate': ['get', 'theta'],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'text-field': ['get', 'serial'],
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'icon-size': 1.5,
      },
      paint: {
        'text-color': '#00ff88',
      },
    });

    // Selected robot overlay icon (stronger edge + glow)
    map.addLayer({
      id: 'fleet-selected-icon',
      type: 'symbol',
      source: 'fleet-source',
      filter: ['==', ['get', 'serial'], '__none__'],
      layout: {
        'icon-image': 'mowbot-arrow-selected',
        'icon-rotate': ['get', 'theta'],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-size': 1.65,
      },
    });

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '340px',
      offset: 18,
      className: 'mowbot-popup',
    });

    map.on('click', 'fleet-layer', (e) => {
      if (e.features?.[0]) {
        const serial = e.features[0].properties?.serial;
        if (typeof serial === 'string' && serial.length > 0) onSelectAgv(serial);
      }
    });

    // Make it feel clickable
    map.on('mouseenter', 'fleet-layer', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'fleet-layer', () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    map.on('mousemove', 'fleet-layer', (e) => {
      const f = e.features?.[0];
      if (!f || !f.geometry || f.geometry.type !== 'Point') return;
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      const p = f.properties ?? {};
      const serial = String(p.serial ?? '');
      const mode = String(p.operating_mode ?? '—');
      const battery = typeof p.battery === 'number' ? p.battery : Number(p.battery);
      const lastUpdate = String(p.last_update ?? '');

      const batteryText = Number.isFinite(battery) ? `${battery.toFixed(0)}%` : '—';
      popup
        .setLngLat(coords)
        .setHTML(
          `<div style="
            background: rgba(6, 10, 16, 0.86);
            border: 1px solid rgba(255,255,255,0.18);
            border-radius: 22px;
            padding: 16px 18px;
            backdrop-filter: blur(10px);
            box-shadow: 0 24px 70px rgba(0,0,0,0.6);
            color: rgba(255,255,255,0.96);
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          ">
            <div style="display:flex; align-items:baseline; justify-content:space-between; gap:12px;">
              <div style="font-weight:900; letter-spacing:-0.02em; font-size:18px; line-height:24px;">${serial}</div>
              <div style="color: ${Number.isFinite(battery) && battery > 20 ? '#00ff88' : '#ff6b6b'}; font-weight:900; font-size:18px; line-height:24px;">${batteryText}</div>
            </div>
            <div style="margin-top:12px; font-size:16px; color: rgba(255,255,255,0.78); display:flex; gap:12px; align-items:baseline;">
              <span style="color: rgba(255,255,255,0.55); text-transform:uppercase; letter-spacing:0.18em; font-size:13px; line-height:22px;">mode</span>
              <span style="color: rgba(255,255,255,0.92); font-weight:800; line-height:22px;">${mode}</span>
            </div>
            ${
              lastUpdate
                ? `<div style="margin-top:8px; font-size:14px; color: rgba(255,255,255,0.62); display:flex; gap:10px;">
                     <span style="color: rgba(255,255,255,0.45); text-transform:uppercase; letter-spacing:0.18em; font-size:13px; line-height:22px;">update</span>
                     <span style="color: rgba(255,255,255,0.80); line-height:22px;">${lastUpdate}</span>
                   </div>`
                : ''
            }
          </div>`
        )
        .addTo(map);
    });
  };
  img.onload = maybeInit;
  imgSelected.onload = maybeInit;
  img.src = 'data:image/svg+xml;base64,' + btoa(MOWBOT_ARROW_SVG);
  imgSelected.src = 'data:image/svg+xml;base64,' + btoa(MOWBOT_ARROW_SELECTED_SVG);
}

const MapComponent: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { fleet, selectedAgv, focusRequest, requestFocusAgv } = useFleetStore();
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('satellite');
  const hasAutoFit = useRef(false);
  const fleetRef = useRef(fleet);

  // 1. Initialize Map (after layout so container has dimensions)
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const container = mapContainer.current;
    const init = () => {
      if (map.current || !container?.parentElement) return;
      map.current = new maplibregl.Map({
        container,
        style: SATELLITE_STYLE,
        // Start zoomed out so "world view" is visible immediately.
        center: [0, 20],
        zoom: 1.6,
      });

      map.current.on('load', () => {
      map.current?.addSource('fleet-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      addFleetToMap(map.current, requestFocusAgv);
      });
    };

    const rafId = requestAnimationFrame(init);
    return () => {
      cancelAnimationFrame(rafId);
      map.current?.remove();
    };
  }, [requestFocusAgv]);

  // 2. Satellite / Street style toggle
  const setStyle = useCallback((style: 'street' | 'satellite') => {
    if (!map.current) return;
    setMapStyle(style);
    const url = style === 'satellite' ? SATELLITE_STYLE : STREET_STYLE;
    map.current.setStyle(url);
    map.current.once('load', () => {
      map.current?.addSource('fleet-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      addFleetToMap(map.current, requestFocusAgv);
    });
  }, [requestFocusAgv]);

  // 2.5 Auto-fit: once telemetry arrives, fit camera to all robots
  useEffect(() => {
    if (!map.current || hasAutoFit.current) return;

    const coords = Object.values(fleet)
      .map((a) => a.position)
      .filter(
        (p): p is [number, number] =>
          Array.isArray(p) &&
          p.length >= 2 &&
          Number.isFinite(p[0]) &&
          Number.isFinite(p[1])
      )
      .map(([lng, lat]) => [lng, lat] as [number, number]);

    if (coords.length === 0) return;

    if (coords.length === 1) {
      const [lng, lat] = coords[0];
      map.current.flyTo({ center: [lng, lat], zoom: 16, duration: 900 });
      hasAutoFit.current = true;
      return;
    }

    const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]);
    for (const c of coords.slice(1)) bounds.extend(c);

    map.current.fitBounds(bounds, {
      padding: 80,
      duration: 900,
      // If robots are close together, don't zoom in too aggressively on first load.
      maxZoom: 14,
    });
    hasAutoFit.current = true;
  }, [fleet]);

  // Keep latest fleet in a ref so focusing doesn't re-run on every telemetry update.
  useEffect(() => {
    fleetRef.current = fleet;
  }, [fleet]);

  // 2.6 Focus is ONLY triggered by an explicit UI request (e.g. click in Active Robots list).
  useEffect(() => {
    if (!map.current || !focusRequest) return;
    const agv = fleetRef.current[focusRequest.serial];
    if (!agv?.position || agv.position.length < 2) return;
    const [lng, lat] = agv.position;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    const targetZoom = 16;
    map.current.flyTo({
      center: [lng, lat],
      zoom: Math.max(map.current.getZoom(), targetZoom),
      duration: 800,
      essential: true,
    });
  }, [focusRequest]);

  // 2.7 Highlight selected robot marker (ring under icon)
  useEffect(() => {
    if (!map.current) return;
    if (!map.current.getLayer('fleet-selected-ring')) return;
    const serial = selectedAgv ?? '__none__';
    map.current.setFilter('fleet-selected-ring', ['==', ['get', 'serial'], serial]);
    if (map.current.getLayer('fleet-selected-icon')) {
      map.current.setFilter('fleet-selected-icon', ['==', ['get', 'serial'], serial]);
    }
  }, [selectedAgv]);

  // 3. Update AGV positions in real time
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const source = map.current.getSource('fleet-source') as maplibregl.GeoJSONSource;
    if (!source) return;

    const features = Object.values(fleet).map((agv) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: agv.position,
      },
      properties: {
        serial: agv.serial,
        // Robot appears clockwise-positive, so do NOT invert sign.
        theta: ((((agv.theta * 180) / Math.PI) + HEADING_OFFSET_DEG) % 360 + 360) % 360,
        battery: agv.battery,
        operating_mode: agv.operating_mode,
        last_update: agv.last_update,
      },
    }));

    source.setData({ type: 'FeatureCollection', features });
  }, [fleet]);

  return (
    /* 1. Main Wrapper: Must be 'relative' to anchor the buttons */
    <div className="relative w-full h-full overflow-hidden">
      
      {/* 2. The Map: Absolute and z-0 to keep it in the background */}
      <div
        ref={mapContainer}
        className="absolute inset-0 w-full h-full z-0"
        style={{ minHeight: '400px' }}
      />
  
      {/* 3. The Controls: Absolute, top-left, and a massive z-index */}
      <div 
        className="absolute top-6 left-6 flex flex-col gap-3 pointer-events-auto"
        style={{ zIndex: 9999 }}
      >
        {/* Label */}
        <div className="bg-black/35 px-3 py-2 rounded-xl shadow-2xl border border-white/10 backdrop-blur-md">
          <p className="text-[#00ff88] font-black text-[10px] tracking-[0.22em] uppercase">
            Telemetry
          </p>
        </div>
  
        {/* Style Switcher */}
        <div className="flex bg-black/35 p-1 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md">
          <button
            onClick={() => setStyle('street')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              mapStyle === 'street' 
              ? 'bg-[#00ff88] text-[#06120b]' 
              : 'text-white/60 hover:text-white'
            }`}
          >
            STREET
          </button>
          <button
            onClick={() => setStyle('satellite')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              mapStyle === 'satellite' 
              ? 'bg-[#00ff88] text-[#06120b]' 
              : 'text-white/60 hover:text-white'
            }`}
          >
            SATELLITE
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
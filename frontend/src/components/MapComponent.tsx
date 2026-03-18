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

// Heading conventions vary by robot stack:
// - MapLibre expects degrees where 0° points "north/up" and positive rotates clockwise.
// - Some robotics stacks also use clockwise-positive; others use CCW-positive.
// Adjust the sign/offset here to align frames.
const HEADING_OFFSET_DEG = 180;

function addFleetToMap(map: maplibregl.Map | null, setSelectedAgv: (s: string | null) => void) {
  if (!map?.getSource('fleet-source')) return;

  const img = new Image(30, 30);
  img.onload = () => {
    if (!map.hasImage('mowbot-arrow')) {
      map.addImage('mowbot-arrow', img);
    }
    if (map.getLayer('fleet-layer')) return;

    map.addLayer({
      id: 'fleet-layer',
      type: 'symbol',
      source: 'fleet-source',
      layout: {
        'icon-image': 'mowbot-arrow',
        'icon-rotate': ['get', 'theta'],
        'icon-rotation-alignment': 'map',
        'text-field': ['get', 'serial'],
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'icon-size': 1.5,
      },
      paint: {
        'text-color': '#00ff88',
      },
    });

    map.on('click', 'fleet-layer', (e) => {
      if (e.features?.[0]) {
        const serial = e.features[0].properties?.serial;
        setSelectedAgv(serial ?? null);
      }
    });
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(MOWBOT_ARROW_SVG);
}

const MapComponent: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { fleet, selectedAgv, setSelectedAgv } = useFleetStore();
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('satellite');
  const hasAutoFit = useRef(false);

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
      addFleetToMap(map.current, setSelectedAgv);
      });
    };

    const rafId = requestAnimationFrame(init);
    return () => {
      cancelAnimationFrame(rafId);
      map.current?.remove();
    };
  }, [setSelectedAgv]);

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
      addFleetToMap(map.current, setSelectedAgv);
    });
  }, [setSelectedAgv]);

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

  // 2.6 Focus selected robot when selection changes (no zoom jump)
  useEffect(() => {
    if (!map.current || !selectedAgv) return;
    const agv = fleet[selectedAgv];
    if (!agv?.position || agv.position.length < 2) return;
    const [lng, lat] = agv.position;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    map.current.easeTo({ center: [lng, lat], duration: 600 });
  }, [fleet, selectedAgv]);

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
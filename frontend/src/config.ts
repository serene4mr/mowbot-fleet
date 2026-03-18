/**
 * Frontend config: API and WebSocket base URLs.
 * Set in .env (Vite exposes VITE_* to the client).
 *
 * - VITE_API_URL   – REST API base (default: same origin as the frontend)
 * - VITE_WS_URL    – optional; if unset, derived from VITE_API_URL as {origin}/ws/fleet
 */

// If VITE_API_URL is unset, default to the current origin so /api and /ws can be proxied via Vite.
const apiUrl = import.meta.env.VITE_API_URL ?? location.origin;

function getWsFleetUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit) return explicit;
  const u = new URL(apiUrl);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${u.origin}/ws/fleet`;
}

export const API_BASE_URL = apiUrl;
export const WS_FLEET_URL = getWsFleetUrl();

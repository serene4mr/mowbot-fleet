import { useFleetStore } from './store/useFleetStore';
import { useAuthStore } from './store/useAuthStore';
import { useWebSocket } from './hooks/useWebSocket';
import { WS_FLEET_URL } from './config';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import FleetDetailPanel from './components/FleetDetailPanel';
import MapOptionsPanel from './components/MapOptionsPanel';
import SettingsPage from './components/SettingsPage';
import MissionsPage from './components/MissionsPage';
import LoginPage from './components/LoginPage';

function App() {
  const token = useAuthStore((s) => s.token);
  const { isConnected, activePage } = useFleetStore();

  useWebSocket(WS_FLEET_URL);

  if (!token) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen w-screen text-white overflow-hidden">
      <Sidebar />

      <main className="flex-1 relative flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 bg-black/20 backdrop-blur-md border-b border-white/10">
          <h1 className="text-xl font-black tracking-tight text-[#00ff88] select-none">
            MOWBOT<span className="text-white/90">FLEET</span>
          </h1>
          <div
            className={`flex items-center gap-2 text-[10px] font-mono tracking-widest ${
              isConnected ? 'text-green-300' : 'text-red-300'
            }`}
            title={isConnected ? 'WebSocket connected' : 'WebSocket disconnected'}
          >
            <span
              className={`w-2 h-2 rounded-full animate-pulse block ${
                isConnected ? 'bg-green-300' : 'bg-red-300'
              }`}
              aria-hidden
            />
            <span>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
          </div>
        </header>

        <div className="flex-1 relative min-h-0">
          {activePage === 'map' && (
            <div className="h-full w-full flex overflow-hidden">
              <aside className="w-96 bg-[#1a1c23] border-r border-gray-800 flex flex-col overflow-hidden shrink-0">
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <MapOptionsPanel />
                  <div className="h-4" />
                  <div className="border-t border-gray-800 px-10 py-4 shrink-0">
                    <div className="text-sm tracking-widest uppercase text-gray-400 font-semibold">
                      Mowbot Detail &amp; Commands
                    </div>
                  </div>
                  <div className="px-10 pb-6">
                    <div className="mx-auto w-full max-w-[18rem]">
                      <FleetDetailPanel />
                    </div>
                  </div>
                </div>
              </aside>
              <div className="flex-1 min-w-0 relative">
                <MapComponent />
              </div>
            </div>
          )}
          {activePage === 'missions' && <MissionsPage />}
          {activePage === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}

export default App;

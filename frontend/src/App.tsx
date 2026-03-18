import { useFleetStore } from './store/useFleetStore';
import { useAuthStore } from './store/useAuthStore';
import { useWebSocket } from './hooks/useWebSocket';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import FleetPage from './components/FleetPage';
import SettingsPage from './components/SettingsPage';
import MissionsPage from './components/MissionsPage';
import LoginPage from './components/LoginPage';

function App() {
  const token = useAuthStore((s) => s.token);
  const { isConnected, activePage } = useFleetStore();

  useWebSocket('ws://localhost:8000/ws/fleet');

  if (!token) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen w-screen bg-[#0e1117] text-white overflow-hidden">
      <Sidebar />

      <main className="flex-1 relative flex flex-col min-w-0">
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#1a1c23]">
          <h1 className="text-xl font-black tracking-tight text-[#00ff88]">
            MOWBOT<span className="text-white">FLEET</span>
          </h1>
          <div
            className={`flex items-center gap-2 text-[10px] font-mono ${isConnected ? 'text-green-400' : 'text-red-400'}`}
            title={isConnected ? 'WebSocket connected' : 'WebSocket disconnected'}
          >
            <span
              className={`w-2 h-2 rounded-full animate-pulse block ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}
              aria-hidden
            />
            <span>{isConnected ? 'LIVE STREAMING' : 'DISCONNECTED'}</span>
          </div>
        </header>

        <div className="flex-1 relative min-h-0">
          {activePage === 'map' && <MapComponent />}
          {activePage === 'fleet' && <FleetPage />}
          {activePage === 'missions' && <MissionsPage />}
          {activePage === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}

export default App;

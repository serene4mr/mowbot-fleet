import { useFleetStore } from '../store/useFleetStore';
import { useAuth } from '../hooks/useAuth';

export default function SettingsPage() {
  const { language, setLanguage } = useFleetStore();
  const { logout } = useAuth();

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="rounded-2xl border border-gray-800 bg-[#11131a] p-6 flex items-center justify-between">
          <div>
            <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">Settings</div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-gray-700 bg-[#0e1117] px-4 py-2 text-xs text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Language */}
        <div className="rounded-2xl border border-gray-800 bg-[#11131a] p-6 space-y-5">
          <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">Language</div>
          <div className="flex gap-3">
            {(['en', 'ko'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                  language === lang
                    ? 'border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88]'
                    : 'border-gray-800 bg-[#0e1117] text-gray-200 hover:bg-gray-900'
                }`}
              >
                {lang === 'en' ? 'English' : '한국어'}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useFleetStore } from '../store/useFleetStore';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../api/client';

interface BrokerForm {
  host: string;
  port: string;
  use_tls: boolean;
  user: string;
  password: string;
  password_set: boolean;
}

const DEFAULT_FORM: BrokerForm = {
  host: 'localhost',
  port: '1883',
  use_tls: false,
  user: '',
  password: '',
  password_set: false,
};

const inputClass =
  'w-full rounded-xl border border-gray-800 bg-[#0e1117] px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#00ff88] transition-colors';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">{label}</div>
        {hint && <div className="text-[10px] text-gray-600">{hint}</div>}
      </div>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export default function SettingsPage() {
  const { language, setLanguage } = useFleetStore();
  const { logout } = useAuth();
  const [form, setForm] = useState<BrokerForm>(DEFAULT_FORM);
  const [loadError, setLoadError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [reconnectStatus, setReconnectStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  useEffect(() => {
    apiClient
      .get('/api/config/broker')
      .then((res) => {
        const d = res.data;
        setForm({
          host: d.host,
          port: String(d.port),
          use_tls: d.use_tls,
          user: d.user,
          password: '',
          password_set: d.password_set,
        });
      })
      .catch(() => setLoadError('Could not load broker config from backend.'));
  }, []);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await apiClient.post('/api/config/broker', {
        host: form.host,
        port: Number(form.port),
        use_tls: form.use_tls,
        user: form.user,
        password: form.password,
      });
      setSaveStatus('saved');
      if (form.password) {
        setForm((f) => ({ ...f, password: '', password_set: true }));
      }
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  const handleReconnect = async () => {
    setReconnectStatus('loading');
    try {
      await apiClient.post('/api/broker/reconnect');
      setReconnectStatus('ok');
      setTimeout(() => setReconnectStatus('idle'), 3000);
    } catch {
      setReconnectStatus('error');
      setTimeout(() => setReconnectStatus('idle'), 4000);
    }
  };

  const patch = (partial: Partial<BrokerForm>) => setForm((f) => ({ ...f, ...partial }));

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="rounded-2xl border border-gray-800 bg-[#11131a] p-6 flex items-center justify-between">
          <div>
            <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">Settings</div>
            <div className="mt-2 text-sm text-gray-300">
              Broker configuration is stored securely on the backend.
            </div>
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

        {/* MQTT Broker */}
        <div className="rounded-2xl border border-gray-800 bg-[#11131a] p-6 space-y-5">
          <div className="text-xs tracking-widest uppercase text-gray-500 font-semibold">MQTT Broker</div>

          {loadError && (
            <div className="rounded-xl border border-yellow-900 bg-yellow-950/30 px-4 py-3 text-xs text-yellow-400">
              {loadError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Host">
              <input
                className={inputClass}
                value={form.host}
                onChange={(e) => patch({ host: e.target.value })}
                placeholder="localhost"
              />
            </Field>

            <Field label="Port">
              <input
                className={inputClass}
                inputMode="numeric"
                value={form.port}
                onChange={(e) => patch({ port: e.target.value })}
                placeholder="1883"
              />
            </Field>

            <Field label="Username">
              <input
                className={inputClass}
                value={form.user}
                onChange={(e) => patch({ user: e.target.value })}
                placeholder="(optional)"
              />
            </Field>

            <Field label="Password" hint={form.password_set ? 'Currently set' : 'Not set'}>
              <input
                className={inputClass}
                type="password"
                value={form.password}
                onChange={(e) => patch({ password: e.target.value })}
                placeholder={form.password_set ? 'Leave blank to keep current' : '(optional)'}
              />
            </Field>
          </div>

          {/* TLS Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-[#0e1117] px-4 py-4">
            <div>
              <div className="text-sm font-bold text-white">Use TLS</div>
              <div className="text-xs text-gray-500">Enable for `mqtts://` brokers (port 8883).</div>
            </div>
            <button
              type="button"
              onClick={() => patch({ use_tls: !form.use_tls })}
              className={`h-8 w-14 rounded-full border transition-colors ${
                form.use_tls ? 'bg-[#00ff88]/20 border-[#00ff88]' : 'bg-[#11131a] border-gray-700'
              }`}
              aria-pressed={form.use_tls}
              aria-label="Toggle TLS"
            >
              <span
                className={`block h-7 w-7 rounded-full bg-white transition-transform ${
                  form.use_tls ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="rounded-xl bg-[#00ff88] px-6 py-3 text-sm font-black text-[#0e1117] transition-opacity disabled:opacity-50 hover:opacity-90"
            >
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save Config'}
            </button>

            <button
              type="button"
              onClick={handleReconnect}
              disabled={reconnectStatus === 'loading'}
              className="rounded-xl border border-gray-700 bg-[#0e1117] px-6 py-3 text-sm font-bold text-gray-300 transition-colors disabled:opacity-50 hover:bg-gray-800 hover:text-white"
            >
              {reconnectStatus === 'loading' ? 'Reconnecting…' : reconnectStatus === 'ok' ? 'Connected!' : reconnectStatus === 'error' ? 'Failed' : 'Reconnect'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

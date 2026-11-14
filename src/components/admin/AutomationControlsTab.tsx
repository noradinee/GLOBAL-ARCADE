import React, { useState, useEffect } from 'react';
import { Sliders, Save, CheckCircle2, Zap, Globe } from 'lucide-react';
import { EngineConfig } from '../../services/adminService';

interface AutomationControlsTabProps {
  config: EngineConfig | null;
  onSaveConfig: (updates: Partial<EngineConfig>) => Promise<void>;
}

export const AutomationControlsTab: React.FC<AutomationControlsTabProps> = ({
  config,
  onSaveConfig,
}) => {
  const [form, setForm] = useState<Partial<EngineConfig>>({});
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({ ...config });
    }
  }, [config]);

  const handleSourceToggle = (source: keyof EngineConfig['enabledSources']) => {
    if (!form.enabledSources) return;
    setForm({
      ...form,
      enabledSources: {
        ...form.enabledSources,
        [source]: !form.enabledSources[source],
      },
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await onSaveConfig(form);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return <div className="p-8 text-center text-slate-400">Loading engine configuration...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Concurrency & Polling Controls */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-xl space-y-6">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-primary-400" />
          Worker Concurrency & Processing Cadence
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Parallel Worker Concurrency: <span className="text-primary-400 font-bold">{form.workerConcurrency || 2}</span> workers
            </label>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={form.workerConcurrency || 2}
              onChange={(e) => setForm({ ...form, workerConcurrency: Number(e.target.value) })}
              className="w-full accent-primary-500 cursor-pointer"
            />
            <p className="mt-1 text-xs text-slate-500">
              Maximum concurrent isolated sandboxes running deep AST inspections & repairs.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Polling Cadence: <span className="text-teal-400 font-bold">{form.pollIntervalSec || 120}</span> seconds
            </label>
            <input
              type="range"
              min="15"
              max="1800"
              step="15"
              value={form.pollIntervalSec || 120}
              onChange={(e) => setForm({ ...form, pollIntervalSec: Number(e.target.value) })}
              className="w-full accent-teal-500 cursor-pointer"
            />
            <p className="mt-1 text-xs text-slate-500">
              Frequency of continuous discovery queries across public sources.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-dark-800">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Per-Source Request Delay: <span className="text-amber-400 font-bold">{form.requestDelayMs || 1000}</span> ms
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              step="100"
              value={form.requestDelayMs || 1000}
              onChange={(e) => setForm({ ...form, requestDelayMs: Number(e.target.value) })}
              className="w-full bg-dark-950 border border-dark-750 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Politeness delay between outbound public API requests to prevent rate limit triggers.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Max Candidates Per Batch (0 = Unlimited Continuous)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.maxCandidatesPerBatch || 0}
              onChange={(e) => setForm({ ...form, maxCandidatesPerBatch: Number(e.target.value) })}
              className="w-full bg-dark-950 border border-dark-750 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Set to 0 to enable unrestricted continuous discovery without artificial caps.
            </p>
          </div>
        </div>
      </div>

      {/* Autonomous Feature Toggles */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Autonomous Pipeline Action Toggles
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-start gap-3 p-4 rounded-xl bg-dark-950 border border-dark-800 cursor-pointer hover:border-dark-700 transition-colors">
            <input
              type="checkbox"
              checked={form.autonomousAcquisition ?? true}
              onChange={(e) => setForm({ ...form, autonomousAcquisition: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-primary-600 focus:ring-primary-500 bg-dark-900 border-dark-700"
            />
            <div>
              <span className="text-sm font-semibold text-slate-200 block">Auto-Acquisition</span>
              <p className="text-xs text-slate-500 mt-1">
                Download candidate sources into isolated staging sandboxes automatically.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 rounded-xl bg-dark-950 border border-dark-800 cursor-pointer hover:border-dark-700 transition-colors">
            <input
              type="checkbox"
              checked={form.autonomousRepair ?? true}
              onChange={(e) => setForm({ ...form, autonomousRepair: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-primary-600 focus:ring-primary-500 bg-dark-900 border-dark-700"
            />
            <div>
              <span className="text-sm font-semibold text-slate-200 block">Auto-Repair</span>
              <p className="text-xs text-slate-500 mt-1">
                Automatically fix missing viewports, trampoline launchers, and asset paths with pristine snapshots.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 rounded-xl bg-dark-950 border border-dark-800 cursor-pointer hover:border-dark-700 transition-colors">
            <input
              type="checkbox"
              checked={form.autonomousPublishing ?? true}
              onChange={(e) => setForm({ ...form, autonomousPublishing: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-primary-600 focus:ring-primary-500 bg-dark-900 border-dark-700"
            />
            <div>
              <span className="text-sm font-semibold text-slate-200 block">Auto-Publishing</span>
              <p className="text-xs text-slate-500 mt-1">
                Deploy clean, fully verified AUTO_APPROVED games straight to the catalog without routine owner prompts.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Discovery Source Toggles */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Globe className="w-5 h-5 text-teal-400" />
          Active Discovery Source Channels
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(['github', 'gitlab', 'codeberg', 'itch', 'hackernews', 'openweb'] as const).map((source) => {
            const isEnabled = form.enabledSources?.[source] ?? true;
            return (
              <button
                type="button"
                key={source}
                onClick={() => handleSourceToggle(source)}
                className={`p-3.5 rounded-xl border text-center transition-all ${
                  isEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                    : 'bg-dark-950 border-dark-800 text-slate-500 line-through'
                }`}
              >
                <div className="text-xs uppercase tracking-wider">{source}</div>
                <div className="text-[10px] mt-1 font-semibold opacity-80">
                  {isEnabled ? 'ENABLED' : 'PAUSED'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Save Action Bar */}
      <div className="flex items-center justify-between p-4 bg-dark-900 border border-dark-800 rounded-xl">
        <div className="text-xs text-slate-400">
          Last updated: {config.lastUpdated ? new Date(config.lastUpdated).toLocaleString() : 'Default settings'}
        </div>
        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Settings saved & live!
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-50 shadow-lg shadow-primary-500/20"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </form>
  );
};

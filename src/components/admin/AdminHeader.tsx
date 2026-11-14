import React from 'react';
import { Play, Pause, RefreshCw, LogOut, Cpu } from 'lucide-react';
import { EngineStatus } from '../../services/adminService';

interface AdminHeaderProps {
  status: EngineStatus | null;
  onStart: () => void;
  onPause: () => void;
  onDiscover: () => void;
  onLogout: () => void;
  isDiscovering: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  status,
  onStart,
  onPause,
  onDiscover,
  onLogout,
  isDiscovering,
}) => {
  const engineState = status?.status || 'IDLE';

  const getStatusBadge = () => {
    switch (engineState) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ENGINE ACTIVE
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            ENGINE PAUSED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            ENGINE STOPPED
          </span>
        );
    }
  };

  return (
    <div className="bg-dark-900 border-b border-dark-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400">
          <Cpu className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100">Autonomous Operations Center</h1>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-slate-400">
            Continuous HTML5 Acquisition, Qualification, Repair & Publishing Engine
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {engineState === 'RUNNING' ? (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
          >
            <Pause className="w-4 h-4" />
            Pause Engine
          </button>
        ) : (
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors"
          >
            <Play className="w-4 h-4" />
            Start Engine
          </button>
        )}

        <button
          onClick={onDiscover}
          disabled={isDiscovering}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isDiscovering ? 'animate-spin' : ''}`} />
          {isDiscovering ? 'Discovering...' : 'Discover Now'}
        </button>

        <button
          onClick={onLogout}
          title="Sign out of Admin Dashboard"
          className="p-2 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-slate-200 border border-dark-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

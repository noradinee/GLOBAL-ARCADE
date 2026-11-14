import React from 'react';
import {
  Compass,
  DownloadCloud,
  CheckCircle2,
  Gamepad2,
  AlertTriangle,
  XCircle,
  Wrench,
  Activity,
  Layers,
  Clock,
} from 'lucide-react';
import { AdminAnalytics, EngineStatus } from '../../services/adminService';

interface OverviewTabProps {
  analytics: AdminAnalytics | null;
  status: EngineStatus | null;
  onNavigateTab: (tabId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ analytics, status, onNavigateTab }) => {
  const vol = analytics?.volume || {
    totalDiscovered: 0,
    authoritativeDossiers: 0,
    activePublishedGames: 0,
    awaitingOwnerReview: 0,
    autoApproved: 0,
    rejected: 0,
    repairedPatches: 0,
  };

  const activeWorkers = status?.activeWorkers || 0;
  const queuedJobs = status?.pipelineSummary.byStatus.QUEUED || 0;
  const lastDiscovery = status?.lastDiscoveryTime
    ? new Date(status.lastDiscoveryTime).toLocaleTimeString()
    : 'None yet';

  const cards = [
    {
      title: 'Discovered Candidates',
      value: vol.totalDiscovered,
      subtitle: `${vol.authoritativeDossiers} dossiers tracked`,
      icon: Compass,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
      tab: 'monitor',
    },
    {
      title: 'Active Pipeline Workers',
      value: activeWorkers,
      subtitle: `${queuedJobs} queued for processing`,
      icon: Activity,
      color: 'text-primary-400',
      bgColor: 'bg-primary-500/10 border-primary-500/20',
      tab: 'monitor',
    },
    {
      title: 'Autonomously Approved',
      value: vol.autoApproved,
      subtitle: `${analytics?.rates.autoApprovalRatePercent || 0}% auto-approval rate`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      tab: 'analytics',
    },
    {
      title: 'Live Published Games',
      value: vol.activePublishedGames,
      subtitle: 'In production catalog',
      icon: Gamepad2,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/20',
      tab: 'games',
    },
    {
      title: 'Awaiting Owner Review',
      value: vol.awaitingOwnerReview,
      subtitle: 'Exceptions requiring human review',
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      tab: 'review',
      alert: vol.awaitingOwnerReview > 0,
    },
    {
      title: 'Automated Code Repairs',
      value: vol.repairedPatches,
      subtitle: 'Defect patches applied cleanly',
      icon: Wrench,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/10 border-teal-500/20',
      tab: 'monitor',
    },
    {
      title: 'Rejected Candidates',
      value: vol.rejected,
      subtitle: 'Preserved in discovery/rejected/',
      icon: XCircle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      tab: 'monitor',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              onClick={() => onNavigateTab(c.tab)}
              className={`p-5 rounded-2xl border ${c.bgColor} cursor-pointer hover:border-primary-500/40 transition-all shadow-lg shadow-black/20`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{c.title}</span>
                <div className={`p-2 rounded-xl bg-dark-900/60 ${c.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-100">{c.value}</span>
                {c.alert && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                    ACTION NEEDED
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">{c.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Engine Live Status Hero */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary-400" />
          Autonomous Engine Operational Telemetry
        </h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-dark-950/60 rounded-xl p-4 border border-dark-800">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary-400" />
              Polling Cadence
            </span>
            <p className="mt-2 text-lg font-bold text-slate-200">
              Every {status?.config.pollIntervalSec || 120}s
            </p>
            <p className="text-xs text-slate-500">Autonomous continuous discovery</p>
          </div>

          <div className="bg-dark-950/60 rounded-xl p-4 border border-dark-800">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <DownloadCloud className="w-4 h-4 text-teal-400" />
              Worker Slots
            </span>
            <p className="mt-2 text-lg font-bold text-slate-200">
              {activeWorkers} / {status?.config.workerConcurrency || 2} Active
            </p>
            <p className="text-xs text-slate-500">Parallel isolated sandbox workers</p>
          </div>

          <div className="bg-dark-950/60 rounded-xl p-4 border border-dark-800">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              Last Polling Cycle
            </span>
            <p className="mt-2 text-lg font-bold text-slate-200">{lastDiscovery}</p>
            <p className="text-xs text-slate-500">
              {status?.isDiscovering ? 'Discovery query in progress...' : 'Idle between polling cycles'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

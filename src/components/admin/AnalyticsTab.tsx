import React, { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Shield, Terminal, RefreshCw } from 'lucide-react';
import { AdminAnalytics } from '../../services/adminService';

interface AnalyticsTabProps {
  analytics: AdminAnalytics | null;
  auditLogs: any[];
  onRefresh: () => void;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ analytics, auditLogs, onRefresh }) => {
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const rates = analytics?.rates || {
    qualificationRatePercent: 0,
    autoApprovalRatePercent: 0,
    repairSuccessRatePercent: 0,
  };

  const sources = analytics?.sourceBreakdown || {};

  const filteredLogs = auditLogs.filter((l) => {
    if (filterAction === 'ALL') return true;
    return l.action === filterAction;
  });

  return (
    <div className="space-y-6">
      {/* Funnel & Conversion Rates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Pipeline Qualification Rate</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-emerald-400">
            {rates.qualificationRatePercent}%
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Percentage of discovered candidates meeting all 4 gates (technical, security, legal, editorial).
          </p>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Autonomous Approval Rate</span>
            <BarChart3 className="w-5 h-5 text-primary-400" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-primary-400">
            {rates.autoApprovalRatePercent}%
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Qualified candidates approved and published autonomously without routine owner intervention.
          </p>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Repair Success Rate</span>
            <Shield className="w-5 h-5 text-teal-400" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-teal-400">
            {rates.repairSuccessRatePercent}%
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Minor defect patches successfully applied, verified, and post-audited without regression.
          </p>
        </div>
      </div>

      {/* Discovery Source Distribution & Operating Costs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary-400" />
            Discovery Volume By Source
          </h3>
          <div className="space-y-3">
            {Object.entries(sources).map(([src, count]) => (
              <div key={src}>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span className="capitalize">{src}</span>
                  <span className="font-bold text-slate-200">{count} candidates</span>
                </div>
                <div className="h-2 w-full bg-dark-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(8, Number(count) * 10))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Infrastructure & Operating Cost Estimates
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-3 rounded-xl bg-dark-950 border border-dark-800">
              <span className="text-slate-400">Public Repositories API Cost</span>
              <span className="font-bold text-emerald-400">$0.00 / month (Free tier)</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-dark-950 border border-dark-800">
              <span className="text-slate-400">Worker Compute Resource Tier</span>
              <span className="font-bold text-slate-200">Standard Container (1 vCPU, 512MB)</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-dark-950 border border-dark-800">
              <span className="text-slate-400">Estimated Total Monthly Cost</span>
              <span className="font-bold text-emerald-400">$0.00 (Zero paid infrastructure required)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              All active discovery adapters (GitHub, GitLab, Codeberg, itch.io, Hacker News, Open Web) operate strictly within zero-cost public rate limits.
            </p>
          </div>
        </div>
      </div>

      {/* Durable Audit Logs Stream */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-dark-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            Authoritative Operations & Owner Audit Logs ({filteredLogs.length})
          </h3>

          <div className="flex items-center gap-3">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-dark-950 border border-dark-750 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">All Actions</option>
              <option value="ENGINE_START">Engine Start</option>
              <option value="ENGINE_PAUSE">Engine Pause</option>
              <option value="CONFIG_UPDATE">Config Update</option>
              <option value="GAME_STATUS_CHANGED">Game Status</option>
              <option value="LOGIN_SUCCESS">Login Success</option>
            </select>

            <button
              onClick={onRefresh}
              className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-dark-800/80 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No audit logs recorded yet.</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-3.5 hover:bg-dark-850/50 flex items-start gap-4">
                <span className="text-slate-500 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-500/10 text-primary-400 border border-primary-500/20 whitespace-nowrap">
                  {log.action}
                </span>
                <span className="text-slate-300 flex-1">{log.details || JSON.stringify(log.updates || {})}</span>
                {log.clientIp && <span className="text-slate-600 text-[11px]">{log.clientIp}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

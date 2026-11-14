import React, { useState } from 'react';
import {
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Ban,
  Terminal,
  Activity,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { JobRecord } from '../../services/adminService';

interface LivePipelineMonitorTabProps {
  jobs: JobRecord[];
  summary: any;
  onCancelJob: (jobId: string) => Promise<void>;
  onRetryJob: (jobId: string) => Promise<void>;
  onRefresh: () => void;
}

export const LivePipelineMonitorTab: React.FC<LivePipelineMonitorTabProps> = ({
  jobs,
  summary,
  onCancelJob,
  onRetryJob,
  onRefresh,
}) => {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const stages = [
    { key: 'DISCOVER', label: 'Discovered', color: 'bg-blue-500/20 text-blue-300' },
    { key: 'ACQUIRE', label: 'Acquiring', color: 'bg-teal-500/20 text-teal-300' },
    { key: 'INSPECT', label: 'Inspecting', color: 'bg-indigo-500/20 text-indigo-300' },
    { key: 'REPAIR', label: 'Repairing', color: 'bg-amber-500/20 text-amber-300' },
    { key: 'RUNTIME_TEST', label: 'Testing', color: 'bg-purple-500/20 text-purple-300' },
    { key: 'PUBLISH', label: 'Published', color: 'bg-emerald-500/20 text-emerald-300' },
    { key: 'OWNER_REVIEW', label: 'Owner Review', color: 'bg-yellow-500/20 text-yellow-300' },
    { key: 'REJECTED', label: 'Rejected', color: 'bg-rose-500/20 text-rose-300' },
  ];

  const filteredJobs = jobs.filter((j) => {
    if (filterStatus === 'ALL') return true;
    return j.status === filterStatus;
  });

  const getStatusBadge = (status: JobRecord['status']) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-500/10 text-primary-400 border border-primary-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-ping" />
            RUNNING
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Clock className="w-3 h-3" />
            QUEUED
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            COMPLETED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            FAILED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Ban className="w-3 h-3" />
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <AlertTriangle className="w-3 h-3" />
            INTERRUPTED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Pipeline Stage Visual Funnel */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-400" />
            Autonomous Processing Funnel
          </h2>
          <button
            onClick={onRefresh}
            className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
          >
            Refresh Data
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {stages.map((st) => {
            const count = summary?.byStage?.[st.key] || 0;
            return (
              <div
                key={st.key}
                className="bg-dark-950/60 border border-dark-800 rounded-xl p-3 text-center"
              >
                <div className="text-lg font-bold text-slate-100">{count}</div>
                <div className={`mt-1 text-[11px] font-semibold px-2 py-0.5 rounded ${st.color}`}>
                  {st.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Jobs Table & Filter Bar */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-dark-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-bold text-slate-200">
              Live Job Execution Queue ({filteredJobs.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-dark-950 border border-dark-750 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">All Jobs</option>
              <option value="RUNNING">Running</option>
              <option value="QUEUED">Queued</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No background jobs match the current filter.
          </div>
        ) : (
          <div className="divide-y divide-dark-800/80">
            {filteredJobs.map((job) => {
              const isExpanded = expandedJobId === job.id;
              const durationSec = job.durationMs > 0 ? (job.durationMs / 1000).toFixed(1) : '-';

              return (
                <div key={job.id} className="hover:bg-dark-850/40 transition-colors">
                  <div
                    onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                    className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-slate-500 hover:text-slate-300">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-100">{job.candidateName}</span>
                          <span className="text-xs text-slate-500 font-mono">({job.sourcePlatform})</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          ID: <span className="font-mono">{job.id}</span>
                          {job.exactCommitHash && (
                            <span className="ml-2 font-mono text-slate-500">
                              commit: {job.exactCommitHash.slice(0, 10)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-semibold text-slate-300">{job.stage}</div>
                        <div className="text-[11px] text-slate-500">
                          {durationSec !== '-' ? `${durationSec}s` : new Date(job.createdAt).toLocaleTimeString()}
                        </div>
                      </div>

                      {getStatusBadge(job.status)}

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {(job.status === 'RUNNING' || job.status === 'QUEUED') && (
                          <button
                            onClick={() => onCancelJob(job.id)}
                            title="Cancel Job"
                            className="p-1.5 rounded-lg bg-dark-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-dark-700 transition-colors"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(job.status === 'FAILED' || job.status === 'CANCELLED' || job.status === 'INTERRUPTED') && (
                          <button
                            onClick={() => onRetryJob(job.id)}
                            title="Retry Job"
                            className="p-1.5 rounded-lg bg-dark-800 hover:bg-primary-500/20 text-slate-400 hover:text-primary-300 border border-dark-700 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Diagnostics Log */}
                  {isExpanded && (
                    <div className="bg-dark-950 p-4 border-t border-dark-800/80 space-y-2 text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-slate-400 font-bold mb-2">
                        <Terminal className="w-3.5 h-3.5 text-primary-400" />
                        Execution Trace & Diagnostics Log
                      </div>
                      {job.error && (
                        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300">
                          <strong>Error:</strong> {job.error}
                        </div>
                      )}
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
                        {job.logs.map((log, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-slate-400">
                            <span className="text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className="text-primary-400 uppercase font-semibold">[{log.stage}]</span>
                            <span className="text-slate-300">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

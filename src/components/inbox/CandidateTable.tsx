import React from 'react';
import { CandidateSummary } from '../../types/inbox';
import {
  ExternalLink,
  HelpCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Github,
  Gitlab,
  Globe,
  Terminal,
} from 'lucide-react';

interface CandidateTableProps {
  candidates: CandidateSummary[];
  onSelectCandidate: (candidateId: string) => void;
  selectedCandidateId?: string | null;
}

export const CandidateTable: React.FC<CandidateTableProps> = ({
  candidates,
  onSelectCandidate,
  selectedCandidateId,
}) => {
  if (candidates.length === 0) {
    return (
      <div className="bg-dark-900/60 border border-dark-800 rounded-2xl p-12 text-center">
        <HelpCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-200 mb-1">No Candidates Found</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          No discovered candidates match the selected filters. Try clearing your search query or adjusting your lifecycle filter.
        </p>
      </div>
    );
  }

  // Render Gate Badge helper
  const renderGateBadge = (
    label: string,
    status: string
  ) => {
    let bg = 'bg-dark-800 text-slate-400 border-dark-700';
    let icon = <Clock className="w-3 h-3 text-slate-400" />;

    if (status === 'PASSED' || status === 'CLEARED_COMMERCIAL' || status === 'APPROVED') {
      bg = 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30';
      icon = <CheckCircle className="w-3 h-3 text-emerald-400" />;
    } else if (status === 'ATTRIBUTION_REQUIRED') {
      bg = 'bg-cyan-950/60 text-cyan-400 border-cyan-500/30';
      icon = <CheckCircle className="w-3 h-3 text-cyan-400" />;
    } else if (
      status === 'REJECTED' ||
      status === 'INCOMPATIBLE' ||
      status === 'LICENSE_REJECTED'
    ) {
      bg = 'bg-rose-950/60 text-rose-400 border-rose-500/30';
      icon = <XCircle className="w-3 h-3 text-rose-400" />;
    } else if (
      status === 'BUILD_REQUIRED' ||
      status === 'SECURITY_REVIEW' ||
      status === 'NEEDS_MANUAL_REVIEW' ||
      status === 'RESTRICTED' ||
      status === 'CHANGES_REQUESTED' ||
      status === 'LICENSE_PENDING'
    ) {
      bg = 'bg-amber-950/60 text-amber-400 border-amber-500/30';
      icon = <AlertTriangle className="w-3 h-3 text-amber-400" />;
    }

    return (
      <span
        title={`${label}: ${status}`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border ${bg}`}
      >
        {icon}
        <span className="font-bold">{label[0]}</span>
      </span>
    );
  };

  // Render Lifecycle status badge
  const renderLifecycleBadge = (c: CandidateSummary) => {
    switch (c.lifecycleStatus) {
      case 'QUALIFIED':
      case 'STAGED':
      case 'READY_FOR_IMPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5" />
            QUALIFIED
          </span>
        );
      case 'REJECTED':
        return (
          <div className="flex flex-col items-start gap-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <XCircle className="w-3.5 h-3.5" />
              REJECTED
            </span>
            {c.rejectionType && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-800 text-slate-300 border border-dark-700">
                {c.rejectionType === 'AUTOMATED_SCREENING' ? '🤖 Automated' : '👤 Reviewer'}
              </span>
            )}
          </div>
        );
      case 'NEEDS_CLARIFICATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <HelpCircle className="w-3.5 h-3.5" />
            CLARIFICATION
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            PENDING
          </span>
        );
    }
  };

  const getSourceIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'github':
        return <Github className="w-3.5 h-3.5 text-slate-300" />;
      case 'gitlab':
        return <Gitlab className="w-3.5 h-3.5 text-orange-400" />;
      case 'codeberg':
        return <Terminal className="w-3.5 h-3.5 text-blue-400" />;
      case 'itch.io':
        return <Globe className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="bg-dark-900/80 border border-dark-750/80 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-dark-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-dark-750">
              <th className="py-3.5 px-4 sm:px-6">Candidate & Source</th>
              <th className="py-3.5 px-4">Four Gates (T/S/L/E)</th>
              <th className="py-3.5 px-4">Lifecycle Status</th>
              <th className="py-3.5 px-4 text-center">Score</th>
              <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800/80 text-sm">
            {candidates.map((c) => {
              const isSelected = selectedCandidateId === c.candidateId;

              return (
                <tr
                  key={c.candidateId}
                  className={`group transition-colors hover:bg-dark-850/70 ${
                    isSelected ? 'bg-dark-800/90 ring-1 ring-brand-purple/40' : ''
                  }`}
                >
                  {/* Candidate Info & Source */}
                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectCandidate(c.candidateId)}
                          className="font-bold text-slate-100 hover:text-brand-cyan transition-colors text-base text-left group-hover:underline"
                        >
                          {c.name}
                        </button>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-dark-800 border border-dark-700 text-slate-300">
                          {getSourceIcon(c.sourcePlatform)}
                          {c.sourcePlatform}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span>by <strong className="text-slate-300">{c.author}</strong></span>
                        <span>•</span>
                        <span>Discovered: {c.discoveryDate}</span>
                        {c.originalRepoUrl && (
                          <>
                            <span>•</span>
                            <a
                              href={c.originalRepoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-slate-400 hover:text-brand-cyan transition-colors"
                              title="Open original repository"
                            >
                              <span>Repo</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        )}
                      </div>

                      {c.rejectionReason && (
                        <div className="mt-2 text-xs text-rose-300 bg-rose-950/30 border border-rose-900/40 rounded-lg p-2">
                          <span className="font-semibold">Rejection reason:</span> {c.rejectionReason}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Four Gates Indicator */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {renderGateBadge('Technical', c.technicalStatus)}
                      {renderGateBadge('Security', c.securityStatus)}
                      {renderGateBadge('Legal', c.legalStatus)}
                      {renderGateBadge('Editorial', c.editorialStatus)}
                    </div>
                  </td>

                  {/* Overall Lifecycle */}
                  <td className="py-4 px-4">
                    {renderLifecycleBadge(c)}
                  </td>

                  {/* Total Score */}
                  <td className="py-4 px-4 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-dark-800 text-brand-cyan border border-dark-700">
                      {c.totalScore} / 100
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4 sm:px-6 text-right">
                    <button
                      onClick={() => onSelectCandidate(c.candidateId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-violet/20 hover:bg-brand-violet text-brand-cyan hover:text-white border border-brand-violet/30 transition-all shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Dossier</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

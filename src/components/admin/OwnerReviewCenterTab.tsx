import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Wrench,
  XCircle,
  Shield,
  FileText,
  ExternalLink,
  Rocket,
  Sparkles,
  History,
  X,
} from 'lucide-react';
import { OwnerDirectPublishModal } from './OwnerDirectPublishModal';
import { FixIssuesModal } from './FixIssuesModal';
import { ExplainAndSolvePanel } from '../inbox/ExplainAndSolvePanel';
import { ModalWrapper } from '../common/ModalWrapper';

interface OwnerReviewCenterTabProps {
  candidates: any[];
  onTakeAction: (candidateId: string, action: string, payload: any) => Promise<void>;
  onRefresh: () => void;
}

export const OwnerReviewCenterTab: React.FC<OwnerReviewCenterTabProps> = ({
  candidates,
  onTakeAction,
  onRefresh,
}) => {
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phase 6 Modals
  const [directPublishCandidate, setDirectPublishCandidate] = useState<any | null>(null);
  const [fixIssuesCandidate, setFixIssuesCandidate] = useState<any | null>(null);
  const [explainCandidate, setExplainCandidate] = useState<any | null>(null);
  const [historyCandidate, setHistoryCandidate] = useState<any | null>(null);

  // Filter candidates that require owner review
  const exceptionCandidates = candidates.filter(
    (c) => c.lifecycleStatus === 'NEEDS_OWNER_REVIEW' || c.lifecycleStatus === 'REPAIR_REQUESTED'
  );

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate || !actionType) return;

    setIsSubmitting(true);
    try {
      if (actionType === 'ACCEPT_EXCEPTION') {
        await onTakeAction(selectedCandidate.candidateId, 'ACCEPT_EXCEPTION', {
          reviewer: 'owner',
          justification: rationale || 'Owner explicitly accepted exception after review.',
        });
      } else if (actionType === 'REQUEST_REPAIR') {
        await onTakeAction(selectedCandidate.candidateId, 'REQUEST_REPAIR', {
          reviewer: 'owner',
          defectDetails: { description: rationale || 'Owner requested code repair.' },
        });
      } else if (actionType === 'FINAL_REJECT') {
        await onTakeAction(selectedCandidate.candidateId, 'FINAL_REJECT', {
          reviewer: 'owner',
          reason: rationale || 'Permanently rejected by owner.',
        });
      }
      setSelectedCandidate(null);
      setActionType(null);
      setRationale('');
      onRefresh();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Owner Exception Review Center ({exceptionCandidates.length})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Explicit owner commands for candidate review, automated issue repair, and direct publication.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
        >
          Refresh Queue
        </button>
      </div>

      {exceptionCandidates.length === 0 ? (
        <div className="bg-dark-900/60 border border-dark-800 rounded-2xl p-12 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
          <h3 className="text-sm font-bold text-slate-200">Zero Exceptions Pending</h3>
          <p className="text-xs text-slate-500 mt-1">
            All candidates were either approved automatically or passed screening without exceptions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {exceptionCandidates.map((cand) => (
            <div
              key={cand.candidateId}
              className="bg-dark-900 border border-dark-800 hover:border-amber-500/40 rounded-2xl p-5 transition-all shadow-lg space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100">{cand.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {cand.lifecycleStatus}
                    </span>
                    <span className="text-xs font-mono text-slate-500">({cand.sourcePlatform})</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                    <span>ID: <code className="text-slate-300">{cand.candidateId}</code></span>
                    <span>License: <strong className="text-slate-200">{cand.licenseName || 'UNKNOWN'}</strong></span>
                    {cand.originalRepoUrl && (
                      <a
                        href={cand.originalRepoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-400 hover:text-primary-300 flex items-center gap-1"
                      >
                        Source Repo <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* FEATURE 1: PUBLISH NOW */}
                  <button
                    onClick={() => setDirectPublishCandidate(cand)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-dark-950 shadow-md shadow-amber-500/20 transition-all"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    PUBLISH NOW
                  </button>

                  {/* FEATURE 2: FIX ISSUES */}
                  <button
                    onClick={() => setFixIssuesCandidate(cand)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 border border-primary-500/40 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    FIX ISSUES
                  </button>

                  {/* FEATURE 3: EXPLAIN & SOLVE */}
                  <button
                    onClick={() => setExplainCandidate(cand)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-800 hover:bg-dark-750 text-slate-300 border border-dark-700 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    EXPLAIN & SOLVE
                  </button>

                  {/* REVIEW HISTORY */}
                  <button
                    onClick={() => setHistoryCandidate(cand)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-slate-200 border border-dark-700 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    HISTORY
                  </button>

                  {/* Final Reject */}
                  <button
                    onClick={() => {
                      setSelectedCandidate(cand);
                      setActionType('FINAL_REJECT');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>

              {/* Exception Reasons & Evidence */}
              <div className="bg-dark-950 p-4 rounded-xl border border-dark-850 space-y-2 text-xs">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Routing Reasons & Diagnostics:
                </div>
                <div className="text-slate-400 pl-5 list-disc space-y-1">
                  {cand.reviewAuditTrail?.slice(-1)[0]?.notes ? (
                    <p>{cand.reviewAuditTrail.slice(-1)[0].notes}</p>
                  ) : (
                    <p>Requires owner evaluation under policy terms.</p>
                  )}
                  {cand.repairs && (
                    <p className="text-emerald-400">
                      ✓ Automated repair patch bundle attached ({cand.repairs.patchesApplied?.length || 0} patches).
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Owner Direct Publish Modal */}
      {directPublishCandidate && (
        <OwnerDirectPublishModal
          candidate={directPublishCandidate}
          onClose={() => setDirectPublishCandidate(null)}
          onSuccess={() => {
            onRefresh();
          }}
          onTriggerFixIssues={() => {
            const cand = directPublishCandidate;
            setDirectPublishCandidate(null);
            setFixIssuesCandidate(cand);
          }}
        />
      )}

      {/* Fix Issues Modal */}
      {fixIssuesCandidate && (
        <FixIssuesModal
          candidate={fixIssuesCandidate}
          onClose={() => setFixIssuesCandidate(null)}
          onSuccess={() => {
            onRefresh();
          }}
          onOpenExplainAndSolve={() => {
            const cand = fixIssuesCandidate;
            setFixIssuesCandidate(null);
            setExplainCandidate(cand);
          }}
          onOpenDirectPublish={() => {
            const cand = fixIssuesCandidate;
            setFixIssuesCandidate(null);
            setDirectPublishCandidate(cand);
          }}
        />
      )}

      {/* Explain & Solve Modal */}
      <ModalWrapper
        isOpen={Boolean(explainCandidate)}
        onClose={() => setExplainCandidate(null)}
        closeOnEscape={true}
        closeOnBackdrop={true}
        backdropClassName="bg-black/80 backdrop-blur-sm"
        containerClassName="w-full max-w-3xl"
        aria-label="Explain and Solve"
      >
        {explainCandidate && (
          <div className="bg-dark-900 border border-dark-750 rounded-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in duration-200 overflow-hidden">
            <div className="p-4 border-b border-dark-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Explain & Solve: {explainCandidate.name}
                </h3>
              </div>
              <button
                onClick={() => setExplainCandidate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <ExplainAndSolvePanel
                candidateId={explainCandidate.candidateId || explainCandidate.id}
                candidateName={explainCandidate.name}
                onRefreshCandidate={onRefresh}
              />
            </div>
          </div>
        )}
      </ModalWrapper>

      {/* Review History Modal */}
      <ModalWrapper
        isOpen={Boolean(historyCandidate)}
        onClose={() => setHistoryCandidate(null)}
        closeOnEscape={true}
        closeOnBackdrop={true}
        backdropClassName="bg-black/80 backdrop-blur-sm"
        containerClassName="w-full max-w-2xl"
        aria-label="Review History"
      >
        {historyCandidate && (
          <div className="bg-dark-900 border border-dark-750 rounded-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in duration-200 overflow-hidden">
            <div className="p-4 border-b border-dark-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Review History & Audit Trail: {historyCandidate.name}
                </h3>
              </div>
              <button
                onClick={() => setHistoryCandidate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {historyCandidate.reviewAuditTrail?.length > 0 ? (
                historyCandidate.reviewAuditTrail.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 bg-dark-950 border border-dark-800 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between items-center text-slate-400 text-[11px]">
                      <span className="font-mono text-primary-400 font-bold">{item.action || 'REVIEW_EVENT'}</span>
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-300 font-semibold">{item.notes || 'No description provided.'}</p>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Reviewer: <strong>{item.reviewer || 'system'}</strong></span>
                      {item.newStatus && <span>Status: <strong className="text-amber-400">{item.newStatus}</strong></span>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-6">No historical review audit entries recorded.</p>
              )}
            </div>
          </div>
        )}
      </ModalWrapper>

      {/* Action Decision Modal (Legacy/Manual) */}
      <ModalWrapper
        isOpen={Boolean(selectedCandidate && actionType)}
        onClose={() => {
          if (!isSubmitting) {
            setSelectedCandidate(null);
            setActionType(null);
          }
        }}
        closeOnEscape={!isSubmitting}
        closeOnBackdrop={!isSubmitting}
        backdropClassName="bg-black/70 backdrop-blur-sm"
        containerClassName="w-full max-w-lg"
        aria-label="Owner Action Decision"
      >
        {selectedCandidate && actionType && (
          <form
            onSubmit={handleActionSubmit}
            className="bg-dark-900 border border-dark-800 rounded-2xl w-full p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-400" />
              Owner Action: {actionType.replace('_', ' ')}
            </h3>
            <p className="text-xs text-slate-400">
              Applying owner decision for candidate <strong className="text-slate-200">"{selectedCandidate.name}"</strong>.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Mandatory Audit Justification / Rationale:
              </label>
              <textarea
                required
                rows={3}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="State the rationale for this owner decision (recorded permanently in the append-only audit trail)..."
                className="w-full bg-dark-950 border border-dark-750 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCandidate(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-750 text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Decision'}
              </button>
            </div>
          </form>
        )}
      </ModalWrapper>
    </div>
  );
};
export default OwnerReviewCenterTab;

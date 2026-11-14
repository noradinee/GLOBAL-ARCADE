import React, { useState } from 'react';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import {
  Rocket,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Wrench,
  AlertTriangle,
  X,
} from 'lucide-react';
import { inboxService } from '../../services/inboxService';

interface OwnerDirectPublishModalProps {
  candidate: any;
  onClose: () => void;
  onSuccess: (result: any) => void;
  onTriggerFixIssues?: () => void;
}

export const OwnerDirectPublishModal: React.FC<OwnerDirectPublishModalProps> = ({
  candidate,
  onClose,
  onSuccess,
  onTriggerFixIssues,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishResult, setPublishResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTechnicalBlocker, setIsTechnicalBlocker] = useState(false);

  const candidateId = candidate.candidateId || candidate.id;
  const candidateName = candidate.name || candidateId;

  // Compile list of automated gates that will be bypassed
  const bypassedWarnings: string[] = [];
  const q = candidate.qualification || {};
  if (q.technical?.status !== 'PASSED') bypassedWarnings.push(`Technical gate: currently "${q.technical?.status || 'UNREVIEWED'}"`);
  if (q.security?.status !== 'PASSED') bypassedWarnings.push(`Security gate: currently "${q.security?.status || 'UNREVIEWED'}"`);
  if (q.legal?.status !== 'CLEARED_COMMERCIAL' && q.legal?.status !== 'ATTRIBUTION_REQUIRED') {
    bypassedWarnings.push(`Commercial legal gate: currently "${q.legal?.status || 'UNREVIEWED'}"`);
  }
  if (q.editorial?.status !== 'APPROVED') bypassedWarnings.push(`Editorial gate: currently "${q.editorial?.status || 'UNREVIEWED'}"`);
  if (candidate.licenseName === 'UNKNOWN' || !candidate.licenseName) {
    bypassedWarnings.push('License identifier is UNKNOWN or missing');
  }

  const handleConfirmPublish = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setIsTechnicalBlocker(false);

    try {
      const res = await inboxService.publishNow(candidateId, 'owner');
      if (res.success) {
        setPublishResult(res.result);
        onSuccess(res.result);
      } else {
        setErrorMessage(res.error || 'Direct publication failed.');
        setIsTechnicalBlocker(res.isTechnicalBlocker || false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Direct publication error.');
      setIsTechnicalBlocker(err.message?.includes('TECHNICAL BLOCKER') || false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { handleBackdropClick } = useModalDismiss({
    isOpen: true,
    onClose,
    closeOnEscape: !isSubmitting,
    closeOnBackdrop: !isSubmitting,
    lockBodyScroll: true,
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-dark-900 border border-dark-750 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100">Owner Direct Publish</h3>
              <p className="text-xs text-slate-400">Explicit owner command with automatic gate bypass</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        {!publishResult ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-dark-950 border border-dark-800 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200 text-sm">{candidateName}</span>
                <span className="font-mono text-slate-400 text-[11px]">{candidateId}</span>
              </div>
              <p className="text-slate-400">
                Author: <strong className="text-slate-300">{candidate.author || 'Independent'}</strong> | Platform:{' '}
                <strong className="text-slate-300">{candidate.sourcePlatform || 'web'}</strong> | License:{' '}
                <strong className="text-slate-300">{candidate.licenseName || 'UNKNOWN'}</strong>
              </p>
            </div>

            {/* Invariant Explanation */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs text-amber-200">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Owner Authority Policy:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                Clicking <strong>Publish Now</strong> immediately executes the publication workflow, deploying the candidate to the production catalog without requiring automated qualification clearance. Safe staging, isolated build, transactional publication, and rollback protections remain fully active.
              </p>
            </div>

            {/* Bypassed Warnings */}
            {bypassedWarnings.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Automated Findings Bypassed by Owner Authority ({bypassedWarnings.length}):
                </span>
                <div className="p-3 bg-dark-950 border border-dark-800 rounded-xl space-y-1 text-[11px] text-slate-400">
                  {bypassedWarnings.map((w, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-amber-400">•</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs text-rose-300">
                <div className="flex items-center gap-2 font-bold text-rose-200">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>Publication Failed:</span>
                </div>
                <p className="leading-relaxed">{errorMessage}</p>

                {isTechnicalBlocker && onTriggerFixIssues && (
                  <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between">
                    <span className="text-[11px] text-rose-200">
                      Automated repair can resolve missing entry points or path references.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onTriggerFixIssues();
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-dark-950 flex items-center gap-1.5"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Run FIX ISSUES
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-750 text-slate-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-dark-950 flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                <Rocket className="w-3.5 h-3.5" />
                {isSubmitting ? 'Publishing Game...' : 'Confirm & Publish Now'}
              </button>
            </div>
          </div>
        ) : (
          /* Actual Publication Result Display */
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h4 className="text-base font-black text-emerald-200">
                Game Successfully Published!
              </h4>
              <p className="text-xs text-slate-300">
                "{candidateName}" has been safely deployed and registered in the production catalog.
              </p>
            </div>

            <div className="p-3.5 bg-dark-950 border border-dark-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Slug:</span>
                <code className="text-slate-200 font-bold">{publishResult.slug}</code>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Entry Point:</span>
                <code className="text-slate-200">{publishResult.url || `/games/${publishResult.slug}/index.html`}</code>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Authorized By:</span>
                <strong className="text-amber-400 font-mono">Owner Authority (Direct Publish)</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Bypassed Findings:</span>
                <span className="text-slate-300 font-semibold">{publishResult.bypassedFindings?.length || 0} recorded in audit trail</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <a
                href={publishResult.url || `/games/${publishResult.slug}/index.html`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white flex items-center gap-1.5 shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Play Game Now
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-750 text-slate-200"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default OwnerDirectPublishModal;

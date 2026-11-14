import React, { useState } from 'react';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  X,
  Sparkles,
  Rocket,
  Search,
  Gamepad2,
  Cpu,
  FileCode2,
} from 'lucide-react';
import { inboxService } from '../../services/inboxService';

interface FixIssuesModalProps {
  candidate: any;
  onClose: () => void;
  onSuccess: (candidate: any) => void;
  onOpenExplainAndSolve?: () => void;
  onOpenDirectPublish?: () => void;
}

export const FixIssuesModal: React.FC<FixIssuesModalProps> = ({
  candidate,
  onClose,
  onSuccess,
  onOpenExplainAndSolve,
  onOpenDirectPublish,
}) => {
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairOutcome, setRepairOutcome] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const candidateId = candidate.candidateId || candidate.id;
  const candidateName = candidate.name || candidateId;

  const handleStartRepair = async () => {
    setIsRepairing(true);
    setErrorMessage(null);
    try {
      const res = await inboxService.fixIssues(candidateId);
      if (res.success || res.repairResult) {
        setRepairOutcome(res);
        if (res.candidate) onSuccess(res.candidate);
      } else {
        setErrorMessage(res.error || 'Repair operation encountered an error.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing automated repair.');
    } finally {
      setIsRepairing(false);
    }
  };

  const { handleBackdropClick } = useModalDismiss({
    isOpen: true,
    onClose,
    closeOnEscape: !isRepairing,
    closeOnBackdrop: !isRepairing,
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
            <div className="p-2 rounded-xl bg-primary-500/10 border border-primary-500/30 text-primary-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100">Autonomous Game Completion</h3>
              <p className="text-xs text-slate-400">Autonomous development, repairs & systems creation</p>
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
        {!repairOutcome ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-dark-950 border border-dark-800 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200 text-sm">{candidateName}</span>
                <span className="font-mono text-slate-400 text-[11px]">{candidateId}</span>
              </div>
              <p className="text-slate-400">
                Operates under the KYRAXO Autonomous Game Completion & Enhancement Policy (KYRAXO-POL-GAME-ENHANCE-001).
              </p>
            </div>

            {/* Agent Division Architecture */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-dark-950 border border-dark-800 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                  <Search className="w-3.5 h-3.5" />
                  <span>OpenCode Agent</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Technical diagnosis, gap analysis & verification review.
                </p>
              </div>
              <div className="p-3 bg-dark-950 border border-dark-800 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Antigravity Agent</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Code development, asset synthesis, mobile controls & rebuilding.
                </p>
              </div>
            </div>

            {/* Autonomous Capabilities & Safety Guarantees */}
            <div className="p-3.5 bg-primary-950/20 border border-primary-500/30 rounded-xl space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-primary-300">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Autonomous Engine Capabilities:</span>
              </div>
              <ul className="text-[11px] space-y-1 text-slate-400 pl-4 list-disc">
                <li><strong className="text-slate-300">Touch Controls:</strong> On-screen virtual D-Pad & action buttons for mobile gameplay.</li>
                <li><strong className="text-slate-300">Procedural Audio:</strong> Web Audio oscillator synthesizer for jump, laser, hit, score, and game over.</li>
                <li><strong className="text-slate-300">Score & Progression:</strong> Local high-score persistence, multi-level curves & particle visual effects.</li>
                <li><strong className="text-slate-300">In-Game HUD & Menus:</strong> Integrated pause overlay, restart button & game over modal.</li>
                <li><strong className="text-slate-300">Project Rebuilding:</strong> Rebuilds incomplete projects into complete 60fps arcade games.</li>
                <li><strong className="text-slate-300">Snapshot Protection:</strong> Original source preserved in <code className="text-slate-300">.original/</code>. Never auto-publishes.</li>
              </ul>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1 text-xs text-rose-300">
                <div className="flex items-center gap-2 font-bold text-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Repair Error:</span>
                </div>
                <p>{errorMessage}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isRepairing}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-750 text-slate-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartRepair}
                disabled={isRepairing}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white flex items-center gap-1.5 shadow-lg shadow-primary-500/20 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isRepairing ? 'Developing & Enhancing Game...' : 'Run Autonomous Development'}
              </button>
            </div>
          </div>
        ) : (
          /* Repair Receipt */
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h4 className="text-base font-black text-emerald-200">
                {repairOutcome.repairResult?.repaired
                  ? `Applied ${repairOutcome.repairResult.patchesApplied?.length || 0} Development Enhancement(s)`
                  : 'Staging Files Inspected'}
              </h4>
              <p className="text-xs text-slate-300">
                {repairOutcome.message || 'Autonomous game development routine completed cleanly.'}
              </p>
              {repairOutcome.jobId && (
                <div className="inline-block mt-1 px-2.5 py-1 bg-dark-950/80 border border-emerald-500/30 rounded-lg text-[11px] font-mono text-emerald-400">
                  Job ID: {repairOutcome.jobId}
                </div>
              )}
            </div>

            {/* Agent Division Badges */}
            <div className="flex items-center justify-center gap-2 text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold flex items-center gap-1">
                <Search className="w-3 h-3" /> OpenCode: Inspected
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1">
                <Cpu className="w-3 h-3" /> Antigravity: Enhanced
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">
                POL-GAME-ENHANCE-001
              </span>
            </div>

            {/* Modified / Created Files */}
            {repairOutcome.enhancedFiles && repairOutcome.enhancedFiles.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5 text-primary-400" />
                  Enhanced / Generated Files:
                </span>
                <div className="p-2.5 bg-dark-950 border border-dark-800 rounded-xl flex flex-wrap gap-1.5">
                  {repairOutcome.enhancedFiles.map((f: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-dark-800 border border-dark-700 rounded text-[11px] font-mono text-primary-300"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Patch Receipt Changelog */}
            {repairOutcome.repairResult?.changelog?.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">
                  Development Changelog:
                </span>
                <div className="p-3 bg-dark-950 border border-dark-800 rounded-xl space-y-1 text-[11px] text-slate-300 max-h-36 overflow-y-auto">
                  {repairOutcome.repairResult.changelog.map((c: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Post-Repair Test Results */}
            {repairOutcome.postRepairTests && (
              <div className="p-3 bg-dark-950 border border-dark-800 rounded-xl space-y-1 text-xs text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Post-Repair Security Verification:</span>
                  <span className={repairOutcome.postRepairTests.securityPassed ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {repairOutcome.postRepairTests.securityPassed ? 'PASSED' : 'FLAGGED'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Post-Repair License Verification:</span>
                  <span className={repairOutcome.postRepairTests.licensePassed ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {repairOutcome.postRepairTests.licensePassed ? 'PASSED' : 'CHECK REQUIRED'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Publication Invariant:</span>
                  <strong className="text-slate-300">Preserved in Owner Review (Not Auto-Published)</strong>
                </div>
              </div>
            )}

            {/* Next Step Options */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-2">
                {onOpenExplainAndSolve && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenExplainAndSolve();
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-750 text-slate-300 flex items-center gap-1.5 border border-dark-700"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Explain & Solve
                  </button>
                )}
                {onOpenDirectPublish && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDirectPublish();
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1.5"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    Publish Now
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-750 text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default FixIssuesModal;

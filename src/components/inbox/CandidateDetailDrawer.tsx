import React, { useState } from 'react';
import {
  CandidateDossier,
} from '../../types/inbox';
import {
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
  HelpCircle,
  Cpu,
  BookmarkCheck,
  Rocket,
  Wrench,
  Sparkles,
} from 'lucide-react';
import { OwnerDirectPublishModal } from '../admin/OwnerDirectPublishModal';
import { FixIssuesModal } from '../admin/FixIssuesModal';
import { ExplainAndSolvePanel } from './ExplainAndSolvePanel';
import { useModalDismiss } from '../../hooks/useModalDismiss';

interface CandidateDetailDrawerProps {
  candidate: CandidateDossier;
  onClose: () => void;
  onUpdateGate: (pillar: 'technical' | 'security' | 'legal' | 'editorial', status: string, notes?: string) => Promise<void>;
  onQualify: (notes?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onReopen: (reason: string) => Promise<void>;
  onRequestClarification: (notes: string) => Promise<void>;
}

export const CandidateDetailDrawer: React.FC<CandidateDetailDrawerProps> = ({
  candidate,
  onClose,
  onUpdateGate,
  onQualify,
  onReject,
  onReopen,
  onRequestClarification,
}) => {
  const [activeTab, setActiveTab] = useState<'gates' | 'audit' | 'source' | 'explain'>('gates');
  const [directPublishOpen, setDirectPublishOpen] = useState(false);
  const [fixIssuesOpen, setFixIssuesOpen] = useState(false);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [reopenReasonInput, setReopenReasonInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const q = candidate.qualification;
  const isRejected = candidate.lifecycleStatus === 'REJECTED';
  const candidateScore = candidate.scores?.totalScore ?? candidate.totalScore ?? 0;

  // Check if candidate qualifies for production approval
  const canQualify =
    q &&
    q.technical.status === 'PASSED' &&
    q.security.status === 'PASSED' &&
    (q.legal.status === 'CLEARED_COMMERCIAL' || q.legal.status === 'ATTRIBUTION_REQUIRED') &&
    q.editorial.status === 'APPROVED' &&
    candidate.lifecycleStatus !== 'QUALIFIED';

  const missingRequirements: string[] = [];
  if (q) {
    if (q.technical.status !== 'PASSED') missingRequirements.push(`Technical gate not PASSED (current: ${q.technical.status})`);
    if (q.security.status !== 'PASSED') missingRequirements.push(`Security gate not PASSED (current: ${q.security.status})`);
    if (q.legal.status !== 'CLEARED_COMMERCIAL' && q.legal.status !== 'ATTRIBUTION_REQUIRED') {
      missingRequirements.push(`Legal gate not cleared for commercial distribution (current: ${q.legal.status})`);
    }
    if (q.editorial.status !== 'APPROVED') missingRequirements.push(`Editorial gate not APPROVED (current: ${q.editorial.status})`);
  }

  const handleGateAction = async (pillar: 'technical' | 'security' | 'legal' | 'editorial', status: string) => {
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      const notes = actionNotes[pillar] || '';
      await onUpdateGate(pillar, status, notes);
      setFeedbackMessage({ text: `Successfully updated ${pillar} gate to ${status}.`, type: 'success' });
      setActionNotes((prev) => ({ ...prev, [pillar]: '' }));
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Failed to update gate', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQualifyCandidate = async () => {
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      await onQualify(actionNotes['qualify'] || 'Owner verified all four gates passed.');
      setFeedbackMessage({ text: 'Candidate successfully approved as QUALIFIED for production!', type: 'success' });
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Cannot qualify candidate', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectCandidate = async () => {
    if (!rejectReasonInput.trim()) {
      setFeedbackMessage({ text: 'Rejection reason is mandatory.', type: 'error' });
      return;
    }
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      await onReject(rejectReasonInput.trim());
      setFeedbackMessage({ text: 'Candidate rejected and archived in authoritative records.', type: 'success' });
      setRejectReasonInput('');
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Failed to reject candidate', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopenCandidate = async () => {
    if (!reopenReasonInput.trim()) {
      setFeedbackMessage({ text: 'Re-evaluation justification is mandatory.', type: 'error' });
      return;
    }
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      await onReopen(reopenReasonInput.trim());
      setFeedbackMessage({ text: 'Candidate reopened for re-evaluation in INBOX_PENDING status.', type: 'success' });
      setReopenReasonInput('');
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Failed to reopen candidate', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClarifyCandidate = async () => {
    const notes = actionNotes['clarify'] || 'Requested additional details / asset verification';
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      await onRequestClarification(notes);
      setFeedbackMessage({ text: 'Candidate marked as NEEDS_CLARIFICATION.', type: 'success' });
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Failed to request clarification', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    let color = 'bg-dark-800 text-slate-300 border-dark-700';
    if (status === 'PASSED' || status === 'CLEARED_COMMERCIAL' || status === 'APPROVED') {
      color = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
    } else if (status === 'ATTRIBUTION_REQUIRED') {
      color = 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40';
    } else if (status === 'REJECTED' || status === 'INCOMPATIBLE' || status === 'LICENSE_REJECTED') {
      color = 'bg-rose-950/80 text-rose-300 border-rose-500/40';
    } else if (status === 'BUILD_REQUIRED' || status === 'RESTRICTED' || status === 'SECURITY_REVIEW') {
      color = 'bg-amber-950/80 text-amber-300 border-amber-500/40';
    }

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${color}`}>
        {status}
      </span>
    );
  };

  const { handleBackdropClick } = useModalDismiss({
    isOpen: true,
    onClose,
    closeOnEscape: !directPublishOpen && !fixIssuesOpen,
    closeOnBackdrop: !directPublishOpen && !fixIssuesOpen,
    lockBodyScroll: true,
  });

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-3xl bg-dark-950 border-l border-dark-750 h-full overflow-y-auto flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Drawer Header */}
        <div className="sticky top-0 z-10 bg-dark-950/95 backdrop-blur-md p-6 border-b border-dark-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-dark-800 text-brand-cyan border border-dark-700">
                {candidate.candidateId}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-dark-800 text-slate-300 border border-dark-700 uppercase">
                {candidate.sourcePlatform}
              </span>
              {renderStatusBadge(candidate.lifecycleStatus)}
            </div>
            <h2 className="text-2xl font-black text-white">{candidate.name}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Discovered {candidate.discoveryDate} • Author:{' '}
              <strong className="text-slate-200">{candidate.author}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-dark-900 hover:bg-dark-800 border border-dark-800 transition-colors"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : 'bg-rose-950/60 text-rose-300 border-rose-800'
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button onClick={() => setFeedbackMessage(null)} className="text-xs opacity-75 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Rejection Alert Banner (when rejected) */}
        {isRejected && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-rose-200">
            <div className="flex items-center gap-2 font-bold text-sm mb-1 text-rose-300">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>
                Preserved Rejected Candidate ({candidate.rejectionType === 'AUTOMATED_SCREENING' ? 'Automated Screening' : 'Human Reviewer'})
              </span>
            </div>
            <p className="text-xs text-rose-200 mt-1">
              <strong>Rejection Reason:</strong> {candidate.rejectionReason || candidate.reviewNotes || 'Does not meet commercial or technical gates.'}
            </p>
            {candidate.rejectionDate && (
              <p className="text-[11px] text-rose-400 mt-1">Recorded: {candidate.rejectionDate}</p>
            )}

            {/* Reopen Controls */}
            <div className="mt-3 pt-3 border-t border-rose-900/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={reopenReasonInput}
                onChange={(e) => setReopenReasonInput(e.target.value)}
                placeholder="Reason for re-evaluation (e.g. author updated license)..."
                className="flex-1 bg-dark-900 border border-rose-900/60 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-400"
              />
              <button
                onClick={handleReopenCandidate}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-dark-950 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen for Re-Evaluation</span>
              </button>
            </div>
          </div>
        )}

        {/* Owner Command Toolbar (Phase 6) */}
        <div className="mx-6 mt-4 p-3 bg-dark-900 border border-dark-750 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDirectPublishOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-dark-950 shadow-md shadow-amber-500/20 transition-all"
            >
              <Rocket className="w-4 h-4" />
              PUBLISH NOW
            </button>

            <button
              onClick={() => setFixIssuesOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary-600/30 hover:bg-primary-600/40 text-primary-200 border border-primary-500/40 transition-colors"
            >
              <Wrench className="w-4 h-4" />
              FIX ISSUES
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('explain')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                activeTab === 'explain'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-dark-800 text-slate-300 border-dark-700 hover:bg-dark-750'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Explain & Solve
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-4 border-b border-dark-800 flex gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('gates')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'gates'
                ? 'border-brand-purple text-brand-cyan'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Four Qualification Gates
          </button>
          <button
            onClick={() => setActiveTab('source')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'source'
                ? 'border-brand-purple text-brand-cyan'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Source Metadata & Identity
          </button>
          <button
            onClick={() => setActiveTab('explain')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'explain'
                ? 'border-brand-purple text-brand-cyan'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Explain & Solve
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-brand-purple text-brand-cyan'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Review Audit Trail ({candidate.reviewAuditTrail?.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 space-y-6">

          {/* TAB 1: FOUR GATES */}
          {activeTab === 'gates' && (
            <div className="space-y-6">
              
              {/* Overall Qualification Status Card */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Qualification Gate</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base font-black text-slate-100">
                      {candidate.lifecycleStatus === 'QUALIFIED' ? 'QUALIFIED FOR CATALOG' : 'INBOX REVIEW PENDING'}
                    </span>
                    {canQualify && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        ALL 4 GATES PASSED
                      </span>
                    )}
                  </div>
                  {missingRequirements.length > 0 && candidate.lifecycleStatus !== 'QUALIFIED' && (
                    <div className="mt-2 text-xs text-amber-400/90 space-y-0.5">
                      <p className="font-semibold">Missing Requirements for Qualification:</p>
                      {missingRequirements.map((req, idx) => (
                        <p key={idx} className="text-[11px] text-slate-400">• {req}</p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <button
                    onClick={handleQualifyCandidate}
                    disabled={!canQualify || isSubmitting}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                      canQualify
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-glow-emerald hover:scale-105 cursor-pointer'
                        : 'bg-dark-800 text-slate-500 border border-dark-700 cursor-not-allowed'
                    }`}
                    title={canQualify ? 'Approve candidate for production import' : 'Cannot qualify: All 4 gates must pass first'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve for Qualification</span>
                  </button>

                  <button
                    onClick={handleClarifyCandidate}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Request Clarification</span>
                  </button>
                </div>
              </div>

              {/* Gate 1: Technical Gate */}
              <div className="p-4 rounded-2xl bg-dark-900/90 border border-dark-750">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-brand-cyan" />
                    <h3 className="text-sm font-bold text-slate-100">1. Technical Gate</h3>
                  </div>
                  {renderStatusBadge(q?.technical?.status || 'UNREVIEWED')}
                </div>
                <div className="text-xs text-slate-400 space-y-1 mt-2">
                  <p>Runtime: <strong className="text-slate-200">{q?.technical?.runtimeType || candidate.gameEngine || 'HTML5 / JS'}</strong></p>
                  <p>Mobile Touch: <strong className="text-slate-200">{q?.technical?.mobileReady ? 'Touch Enabled' : 'Desktop Keyboard Only'}</strong></p>
                  <p>Deployment: <strong className="text-slate-200">{q?.technical?.deployment || 'STATIC_READY'}</strong></p>
                  {q?.technical?.evidence && q.technical.evidence.length > 0 && (
                    <div className="mt-2 bg-dark-950 p-2.5 rounded-xl border border-dark-800">
                      <p className="text-[11px] font-semibold text-slate-300 mb-1">Technical Findings & Evidence:</p>
                      {q.technical.evidence.map((ev, i) => (
                        <p key={i} className="text-[11px] text-slate-400">• {ev}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gate 1 Reviewer Actions */}
                <div className="mt-4 pt-3 border-t border-dark-800 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Technical review notes..."
                    value={actionNotes['technical'] || ''}
                    onChange={(e) => setActionNotes((p) => ({ ...p, technical: e.target.value }))}
                    className="flex-1 min-w-[200px] bg-dark-950 border border-dark-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-purple"
                  />
                  <button
                    onClick={() => handleGateAction('technical', 'PASSED')}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40"
                  >
                    Approve Tech
                  </button>
                  <button
                    onClick={() => handleGateAction('technical', 'REJECTED')}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/40"
                  >
                    Reject Tech
                  </button>
                </div>
              </div>

              {/* Gate 2: Security Gate */}
              <div className="p-4 rounded-2xl bg-dark-900/90 border border-dark-750">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-slate-100">2. Security Gate</h3>
                  </div>
                  {renderStatusBadge(q?.security?.status || 'UNREVIEWED')}
                </div>
                <div className="text-xs text-slate-400 space-y-1 mt-2">
                  <p>Static AST Scan: <strong className="text-slate-200">{q?.security?.staticScanPassed ? 'PASSED (0 critical violations)' : 'Pending / Flagged'}</strong></p>
                  {q?.security?.findings && q.security.findings.length > 0 ? (
                    <div className="mt-2 bg-dark-950 p-2.5 rounded-xl border border-dark-800 space-y-1">
                      <p className="text-[11px] font-semibold text-rose-300">Security Observations ({q.security.findings.length}):</p>
                      {q.security.findings.map((f, i) => (
                        <p key={i} className="text-[11px] text-rose-400">• [{f.severity}] {f.name || f.category}: {f.description || f.snippet}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-emerald-400">Zero static security violations detected.</p>
                  )}
                </div>

                {/* Gate 2 Reviewer Actions */}
                <div className="mt-4 pt-3 border-t border-dark-800 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Security audit notes..."
                    value={actionNotes['security'] || ''}
                    onChange={(e) => setActionNotes((p) => ({ ...p, security: e.target.value }))}
                    className="flex-1 min-w-[200px] bg-dark-950 border border-dark-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-purple"
                  />
                  <button
                    onClick={() => handleGateAction('security', 'PASSED')}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40"
                  >
                    Approve Security
                  </button>
                  <button
                    onClick={() => handleGateAction('security', 'REJECTED')}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/40"
                  >
                    Reject Security
                  </button>
                </div>
              </div>

              {/* Gate 3: Legal Gate */}
              <div className="p-4 rounded-2xl bg-dark-900/90 border border-dark-750">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-slate-100">3. Legal Gate</h3>
                  </div>
                  {renderStatusBadge(q?.legal?.status || 'UNREVIEWED')}
                </div>
                <div className="text-xs text-slate-400 space-y-1 mt-2">
                  <p>Code License SPDX: <strong className="text-slate-200">{q?.legal?.codeLicenseSpdx || candidate.licenseName || 'UNKNOWN'}</strong></p>
                  <p>Asset Licensing: <strong className="text-slate-200">{q?.legal?.assetLicenseStatus || candidate.assetLicensingStatus || 'Unspecified'}</strong></p>
                  <p>Commercial Redistribution: <strong className="text-slate-200">{q?.legal?.commercialRedistributionAllowed ? 'Allowed' : 'Not Cleared'}</strong></p>
                  {q?.legal?.evidence && q.legal.evidence.length > 0 && (
                    <div className="mt-2 bg-dark-950 p-2.5 rounded-xl border border-dark-800">
                      <p className="text-[11px] font-semibold text-slate-300 mb-1">Legal Evaluation & Evidence:</p>
                      {q.legal.evidence.map((ev, i) => (
                        <p key={i} className="text-[11px] text-slate-400">• {ev}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gate 3 Reviewer Actions */}
                <div className="mt-4 pt-3 border-t border-dark-800 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Legal review notes..."
                    value={actionNotes['legal'] || ''}
                    onChange={(e) => setActionNotes((p) => ({ ...p, legal: e.target.value }))}
                    className="flex-1 min-w-[200px] bg-dark-950 border border-dark-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-purple"
                  />
                  <button
                    onClick={() => handleGateAction('legal', 'CLEARED_COMMERCIAL')}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40"
                  >
                    Clear Commercial
                  </button>
                  <button
                    onClick={() => handleGateAction('legal', 'ATTRIBUTION_REQUIRED')}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/40"
                  >
                    Attribution Required
                  </button>
                  <button
                    onClick={() => handleGateAction('legal', 'RESTRICTED')}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40"
                  >
                    Mark Restricted
                  </button>
                </div>
              </div>

              {/* Gate 4: Editorial Gate */}
              <div className="p-4 rounded-2xl bg-dark-900/90 border border-dark-750">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookmarkCheck className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-slate-100">4. Editorial Gate</h3>
                  </div>
                  {renderStatusBadge(q?.editorial?.status || 'UNREVIEWED')}
                </div>
                <div className="text-xs text-slate-400 space-y-1 mt-2">
                  <p>Gameplay Rating: <strong className="text-slate-200">{q?.editorial?.gameplayScore || (candidateScore > 0 ? Math.round(candidateScore / 20) : 0)} / 5</strong></p>
                  <p>Arabic Translation: <strong className="text-slate-200">{q?.editorial?.titleAr ? 'Translated' : 'Pending Translation'}</strong></p>
                  {q?.editorial?.evidence && q.editorial.evidence.length > 0 && (
                    <div className="mt-2 bg-dark-950 p-2.5 rounded-xl border border-dark-800">
                      <p className="text-[11px] font-semibold text-slate-300 mb-1">Editorial Observations:</p>
                      {q.editorial.evidence.map((ev, i) => (
                        <p key={i} className="text-[11px] text-slate-400">• {ev}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gate 4 Reviewer Actions */}
                <div className="mt-4 pt-3 border-t border-dark-800 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Editorial review notes..."
                    value={actionNotes['editorial'] || ''}
                    onChange={(e) => setActionNotes((p) => ({ ...p, editorial: e.target.value }))}
                    className="flex-1 min-w-[200px] bg-dark-950 border border-dark-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-purple"
                  />
                  <button
                    onClick={() => handleGateAction('editorial', 'APPROVED')}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40"
                  >
                    Approve Editorial
                  </button>
                  <button
                    onClick={() => handleGateAction('editorial', 'CHANGES_REQUESTED')}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40"
                  >
                    Request Changes
                  </button>
                </div>
              </div>

              {/* Rejection Section */}
              {!isRejected && (
                <div className="p-4 rounded-2xl bg-dark-900/60 border border-rose-900/30">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">Reject Candidate</h4>
                  <p className="text-xs text-slate-400 mb-3">
                    Marks candidate as rejected and preserves the authoritative dossier permanently for future manual inspection and re-evaluation. Never deletes any files.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Specify rejection reason (e.g. restrictive license, non-HTML5)..."
                      value={rejectReasonInput}
                      onChange={(e) => setRejectReasonInput(e.target.value)}
                      className="flex-1 bg-dark-950 border border-dark-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                    <button
                      onClick={handleRejectCandidate}
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
                    >
                      Reject Candidate
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SOURCE METADATA & IDENTITY */}
          {activeTab === 'source' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Source Identity</h4>
                <div className="grid grid-cols-2 gap-2">
                  <p><span className="text-slate-400">Distribution Type:</span> <strong className="text-slate-200">{candidate.sourceType || 'git'}</strong></p>
                  <p><span className="text-slate-400">Source Platform:</span> <strong className="text-slate-200">{candidate.sourcePlatform}</strong></p>
                  <p><span className="text-slate-400">Exact Commit SHA:</span> <strong className="text-brand-cyan font-mono">{candidate.exactCommitHash || 'N/A'}</strong></p>
                  <p><span className="text-slate-400">SHA-256 Fingerprint:</span> <strong className="text-slate-300 font-mono truncate block">{candidate.sourceFingerprint || 'N/A'}</strong></p>
                  <p><span className="text-slate-400">Discovery Date:</span> <strong className="text-slate-200">{candidate.discoveryDate}</strong></p>
                  <p><span className="text-slate-400">Last Update:</span> <strong className="text-slate-200">{candidate.lastUpdateDate || 'N/A'}</strong></p>
                </div>
                {candidate.originalRepoUrl && (
                  <div className="pt-2 border-t border-dark-800">
                    <a
                      href={candidate.originalRepoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-brand-cyan hover:underline"
                    >
                      <span>Visit Canonical Repository: {candidate.originalRepoUrl}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Technical Characteristics</h4>
                <p><span className="text-slate-400">Programming Language:</span> <strong className="text-slate-200">{candidate.programmingLanguage || 'JavaScript'}</strong></p>
                <p><span className="text-slate-400">Game Engine:</span> <strong className="text-slate-200">{candidate.gameEngine || 'HTML5 Canvas2D'}</strong></p>
                <p><span className="text-slate-400">License Name:</span> <strong className="text-slate-200">{candidate.licenseName || 'UNKNOWN'}</strong></p>
                {candidate.description && (
                  <div className="mt-2 pt-2 border-t border-dark-800">
                    <p className="text-slate-400 mb-1">Description:</p>
                    <p className="text-slate-200 bg-dark-950 p-2.5 rounded-xl border border-dark-800">{candidate.description}</p>
                  </div>
                )}
              </div>

              {/* AUDIENCE EVIDENCE & METRICS AUDIT */}
              {candidate.audienceIndicators && (
                <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Audience Evidence Audit</h4>
                    {candidate.audienceIndicators.overallEvidenceQuality && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        candidate.audienceIndicators.overallEvidenceQuality === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        candidate.audienceIndicators.overallEvidenceQuality === 'MEDIUM' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        candidate.audienceIndicators.overallEvidenceQuality === 'LOW' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        'bg-slate-500/20 text-slate-400 border-slate-500/30'
                      }`}>
                        Quality: {candidate.audienceIndicators.overallEvidenceQuality}
                        {candidate.audienceIndicators.evidenceConfidenceScore !== undefined && ` (${candidate.audienceIndicators.evidenceConfidenceScore}%)`}
                      </span>
                    )}
                  </div>

                  {candidate.audienceIndicators.metrics && candidate.audienceIndicators.metrics.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      {candidate.audienceIndicators.metrics.map((m, idx) => (
                        <div key={idx} className="bg-dark-950 p-2.5 rounded-xl border border-dark-800 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-200 capitalize">
                              {m.metricType}: <strong className="text-brand-cyan">{typeof m.originalValue === 'number' ? m.originalValue.toLocaleString() : m.originalValue}</strong> {m.unit}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {m.isSynthetic && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  Illustrative Seed
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                m.evidenceClassification === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                m.evidenceClassification === 'REPORTED' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                m.evidenceClassification === 'ESTIMATED' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                m.evidenceClassification === 'UNVERIFIED' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                'bg-slate-500/20 text-slate-400 border-slate-500/30'
                              }`}>
                                {m.evidenceClassification}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Source: <span className="text-slate-300">{m.sourcePublisher || 'unspecified'}</span>
                            {m.sourceUrl && (
                              <a href={m.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-cyan hover:underline ml-1">
                                [view link]
                              </a>
                            )}
                          </p>
                          {m.notesAndLimitations && (
                            <p className="text-[10px] text-slate-500 italic">“{m.notesAndLimitations}”</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">No itemized audience metrics recorded.</p>
                  )}
                </div>
              )}

              {/* DISCOVERY SOURCES PROVENANCE */}
              {candidate.discoverySources && candidate.discoverySources.length > 0 && (
                <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Discovery Provenance</h4>
                  <div className="space-y-1.5">
                    {candidate.discoverySources.map((s, i) => (
                      <div key={i} className="flex items-center justify-between bg-dark-950 p-2 rounded-xl border border-dark-800 text-[11px]">
                        <div>
                          <span className="font-semibold text-slate-200 capitalize">{s.sourcePlatform}</span>
                          <span className="text-slate-500 ml-2">({s.discoveryDate || 'date N/A'})</span>
                        </div>
                        {s.discoveryUrl && (
                          <a href={s.discoveryUrl} target="_blank" rel="noreferrer" className="text-brand-cyan hover:underline flex items-center gap-1">
                            <span>Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Maintainer Review Audit Trail ({candidate.reviewAuditTrail?.length || 0} entries)
              </h4>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-dark-700">
                {candidate.reviewAuditTrail && candidate.reviewAuditTrail.length > 0 ? (
                  candidate.reviewAuditTrail.map((record, idx) => (
                    <div key={idx} className="relative bg-dark-900 border border-dark-750 rounded-xl p-3 text-xs">
                      <div className="absolute -left-[23px] top-3.5 w-3 h-3 rounded-full bg-brand-purple border-2 border-dark-950" />
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="font-mono text-brand-cyan">{record.action}</span>
                        <span>{record.timestamp}</span>
                      </div>
                      <div className="text-slate-300">
                        <strong className="text-white">{record.reviewer}</strong> • Pillar:{' '}
                        <span className="text-brand-purple">{record.pillar}</span>
                      </div>
                      {record.notes && <p className="text-slate-400 mt-1 italic">"{record.notes}"</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No historical audit records found.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: EXPLAIN & SOLVE (Phase 6 Feature 3) */}
          {activeTab === 'explain' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-dark-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Intelligent Problem Diagnosis & Recommendations
                  </h3>
                  <p className="text-xs text-slate-400">
                    Deep root cause analysis, observable impact assessment, and 1-click remediation.
                  </p>
                </div>
              </div>
              <ExplainAndSolvePanel
                candidateId={candidate.candidateId || (candidate as any).id}
                candidateName={candidate.name}
              />
            </div>
          )}
        </div>

        {/* Modals */}
        {directPublishOpen && (
          <OwnerDirectPublishModal
            candidate={candidate}
            onClose={() => setDirectPublishOpen(false)}
            onSuccess={(result) => {
              setFeedbackMessage({
                text: `Game successfully published to production catalog: /games/${result.slug}/index.html`,
                type: 'success',
              });
            }}
            onTriggerFixIssues={() => {
              setDirectPublishOpen(false);
              setFixIssuesOpen(true);
            }}
          />
        )}

        {fixIssuesOpen && (
          <FixIssuesModal
            candidate={candidate}
            onClose={() => setFixIssuesOpen(false)}
            onSuccess={() => {
              setFeedbackMessage({
                text: 'Automated repairs executed cleanly. Preserved in isolated workspace for review.',
                type: 'success',
              });
            }}
            onOpenExplainAndSolve={() => {
              setFixIssuesOpen(false);
              setActiveTab('explain');
            }}
            onOpenDirectPublish={() => {
              setFixIssuesOpen(false);
              setDirectPublishOpen(true);
            }}
          />
        )}
      </div>
    </div>
  );
};

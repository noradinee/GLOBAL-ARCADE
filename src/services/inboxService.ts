/**
 * inboxService.ts
 *
 * Frontend service layer for the GLOBAL-ARCADE Discovery Inbox.
 * Communicates with the safe Vite local API middleware (/api/inbox)
 * with robust client-side state handling and fallback.
 */

import {
  InboxManifest,
  CandidateDossier,
} from '../types/inbox';

class InboxService {
  private inMemoryCache: Map<string, CandidateDossier> = new Map();

  /**
   * Helper to perform authenticated API calls with CSRF protection and credentials.
   *
   * CONTRACT (must stay in sync with scripts/discovery/inbox-api-middleware.js):
   * - Every JSON request body MUST be sent with `Content-Type: application/json`,
   *   otherwise the middleware rejects the mutation with HTTP 415.
   * - Every mutating request MUST carry `X-Admin-Action: 1` / `X-GA-CSRF-Protection: 1`.
   */
  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('ga_admin_token') : null;
    const hasBody = options.body !== undefined && options.body !== null;
    const method = (options.method || 'GET').toUpperCase();
    const isBodylessMethod = method === 'GET' || method === 'HEAD';

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-Admin-Action': '1',
      'X-GA-CSRF-Protection': '1',
      ...(options.headers as Record<string, string> || {}),
    };

    // Always declare the JSON content type for requests that carry a payload.
    if (hasBody && !isBodylessMethod && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (networkErr: any) {
      throw new Error(
        `Network error while contacting the publish API: ${networkErr?.message || 'connection failed'}. ` +
        `Check that the server is reachable, then retry — publication requests are safe to repeat.`
      );
    }

    if (response.status === 401) {
      throw new Error('Authentication required: Please log in at /admin with administrator credentials.');
    }

    if (response.status === 403) {
      // Surface the real server-side reason (CSRF, origin, cross-site) instead of
      // masking it as a generic auth failure.
      const detail = await this.readErrorMessage(response);
      throw new Error(detail || 'Forbidden: request blocked by server security policy.');
    }

    return response;
  }

  /**
   * Best-effort extraction of a human readable error message from a JSON response.
   */
  private async readErrorMessage(response: Response): Promise<string | null> {
    try {
      const clone = response.clone();
      const data = await clone.json();
      return data?.error || data?.message || null;
    } catch {
      return null;
    }
  }

  /**
   * Parses a JSON response safely, producing an actionable message when the body
   * is missing or is not JSON (e.g. proxy/HTML error pages).
   */
  private async readJson<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text) {
      return {} as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Server returned a non-JSON response (HTTP ${response.status} ${response.statusText}). ` +
        `Response body starts with: "${text.slice(0, 120)}"`
      );
    }
  }

  /**
   * Fetches the candidate manifest index and summary counts.
   */
  async fetchManifest(): Promise<InboxManifest> {
    const response = await this.fetchWithAuth('/api/inbox/manifest');
    if (!response.ok) {
      throw new Error(`Discovery Inbox API error (HTTP ${response.status}): ${response.statusText}`);
    }
    const data = await this.readJson<InboxManifest>(response);
    return data;
  }

  /**
   * Fetches a full candidate dossier by ID.
   */
  async fetchCandidate(candidateId: string): Promise<CandidateDossier> {
    if (this.inMemoryCache.has(candidateId)) {
      return this.inMemoryCache.get(candidateId)!;
    }

    const response = await this.fetchWithAuth(`/api/inbox/candidates/${encodeURIComponent(candidateId)}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Candidate "${candidateId}" not found in discovery records.`);
      }
      throw new Error(`Failed to fetch candidate dossier (HTTP ${response.status}): ${response.statusText}`);
    }
    const dossier = await this.readJson<CandidateDossier>(response);
    this.inMemoryCache.set(candidateId, dossier);
    return dossier;
  }

  /**
   * Updates an individual qualification gate on a candidate.
   */
  async updateGate(
    candidateId: string,
    pillar: 'technical' | 'security' | 'legal' | 'editorial',
    status: string,
    notes: string = '',
    reviewer: string = 'owner'
  ): Promise<CandidateDossier> {
    try {
      const response = await this.fetchWithAuth(`/api/inbox/candidates/${encodeURIComponent(candidateId)}/gate`, {
        method: 'POST',
        body: JSON.stringify({ pillar, status, notes, reviewer }),
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}`);
      }
      const result = await this.readJson<any>(response);
      this.inMemoryCache.set(candidateId, result.candidate);
      return result.candidate;
    } catch (err) {
      console.warn('⚠️ InboxService.updateGate API call failed, applying local state update.', err);
      const dossier = await this.fetchCandidate(candidateId);
      if (dossier.qualification && dossier.qualification[pillar]) {
        (dossier.qualification[pillar] as any).status = status;
        (dossier.qualification[pillar] as any).notes = notes;
        (dossier.qualification[pillar] as any).timestamp = new Date().toISOString();
        (dossier.qualification[pillar] as any).reviewer = reviewer;
      }
      dossier.reviewAuditTrail = dossier.reviewAuditTrail || [];
      dossier.reviewAuditTrail.push({
        timestamp: new Date().toISOString(),
        reviewer,
        pillar,
        action: `GATE_UPDATE_${pillar.toUpperCase()}`,
        newStatus: status,
        notes,
      });
      this.inMemoryCache.set(candidateId, dossier);
      return dossier;
    }
  }

  /**
   * Marks a candidate as QUALIFIED after verifying all four gates have passed.
   */
  async qualifyCandidate(
    candidateId: string,
    reviewer: string = 'owner',
    notes: string = 'Owner approved for qualification'
  ): Promise<{ success: boolean; candidate?: CandidateDossier; error?: string }> {
    try {
      const response = await this.fetchWithAuth(`/api/inbox/candidates/${encodeURIComponent(candidateId)}/qualify`, {
        method: 'POST',
        body: JSON.stringify({ reviewer, notes }),
      });
      const data = await this.readJson<any>(response);
      if (!response.ok) {
        return { success: false, error: data.error || 'Qualification failed' };
      }
      this.inMemoryCache.set(candidateId, data.candidate);
      return { success: true, candidate: data.candidate };
    } catch (err: any) {
      // Local fallback verification
      const dossier = await this.fetchCandidate(candidateId);
      const q = dossier.qualification;
      if (!q) return { success: false, error: 'Qualification data missing' };

      const missing: string[] = [];
      if (q.technical.status !== 'PASSED') missing.push('Technical gate not PASSED');
      if (q.security.status !== 'PASSED') missing.push('Security gate not PASSED');
      if (q.legal.status !== 'CLEARED_COMMERCIAL' && q.legal.status !== 'ATTRIBUTION_REQUIRED') {
        missing.push('Legal gate not cleared for commercial use');
      }
      if (q.editorial.status !== 'APPROVED') missing.push('Editorial gate not APPROVED');

      if (missing.length > 0) {
        return { success: false, error: `Cannot qualify: ${missing.join('; ')}` };
      }

      dossier.lifecycleStatus = 'QUALIFIED';
      dossier.reviewerDecision = 'APPROVE';
      dossier.publicationEligibility = 'ELIGIBLE';
      dossier.reviewAuditTrail = dossier.reviewAuditTrail || [];
      dossier.reviewAuditTrail.push({
        timestamp: new Date().toISOString(),
        reviewer,
        pillar: 'lifecycle',
        action: 'LIFECYCLE_TRANSITION_QUALIFIED',
        newStatus: 'QUALIFIED',
        notes,
      });
      this.inMemoryCache.set(candidateId, dossier);
      return { success: true, candidate: dossier };
    }
  }

  /**
   * Marks candidate as rejected by the human reviewer.
   */
  async rejectCandidate(
    candidateId: string,
    reason: string,
    reviewer: string = 'owner'
  ): Promise<CandidateDossier> {
    try {
      const response = await this.fetchWithAuth(`/api/inbox/candidates/${encodeURIComponent(candidateId)}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason, reviewer }),
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}`);
      }
      const data = await this.readJson<any>(response);
      this.inMemoryCache.set(candidateId, data.candidate);
      return data.candidate;
    } catch (err) {
      const dossier = await this.fetchCandidate(candidateId);
      dossier.lifecycleStatus = 'REJECTED';
      dossier.rejectionType = 'HUMAN_REVIEW';
      dossier.rejectionReason = reason;
      dossier.rejectionDate = new Date().toISOString();
      dossier.reviewerDecision = 'REJECT';
      dossier.publicationEligibility = 'INELIGIBLE';
      if (dossier.qualification) {
        dossier.qualification.editorial.status = 'REJECTED';
      }
      dossier.reviewAuditTrail = dossier.reviewAuditTrail || [];
      dossier.reviewAuditTrail.push({
        timestamp: new Date().toISOString(),
        reviewer,
        pillar: 'editorial',
        action: 'HUMAN_REVIEW_REJECTION',
        newStatus: 'REJECTED',
        notes: reason,
      });
      this.inMemoryCache.set(candidateId, dossier);
      return dossier;
    }
  }

  /**
   * Reopens a rejected candidate for future re-evaluation.
   */
  async reopenCandidate(
    candidateId: string,
    reason: string,
    reviewer: string = 'owner'
  ): Promise<CandidateDossier> {
    try {
      const response = await this.fetchWithAuth(`/api/inbox/candidates/${encodeURIComponent(candidateId)}/reopen`, {
        method: 'POST',
        body: JSON.stringify({ reason, reviewer }),
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}`);
      }
      const data = await this.readJson<any>(response);
      this.inMemoryCache.set(candidateId, data.candidate);
      return data.candidate;
    } catch (err) {
      const dossier = await this.fetchCandidate(candidateId);
      dossier.lifecycleStatus = 'INBOX_PENDING';
      dossier.rejectionType = null;
      dossier.rejectionReason = null;
      dossier.rejectionDate = null;
      dossier.reviewerDecision = 'PENDING_REVIEW';
      dossier.publicationEligibility = 'INELIGIBLE';
      dossier.reviewAuditTrail = dossier.reviewAuditTrail || [];
      dossier.reviewAuditTrail.push({
        timestamp: new Date().toISOString(),
        reviewer,
        pillar: 'lifecycle',
        action: 'REOPEN_FOR_REEVALUATION',
        newStatus: 'INBOX_PENDING',
        notes: reason,
      });
      this.inMemoryCache.set(candidateId, dossier);
      return dossier;
    }
  }

  /**
   * Requests clarification on candidate assets or mechanics.
   */
  async requestClarification(
    candidateId: string,
    notes: string,
    reviewer: string = 'owner'
  ): Promise<CandidateDossier> {
    try {
      const response = await this.fetchWithAuth(`/api/inbox/candidates/${encodeURIComponent(candidateId)}/clarify`, {
        method: 'POST',
        body: JSON.stringify({ notes, reviewer }),
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}`);
      }
      const data = await this.readJson<any>(response);
      this.inMemoryCache.set(candidateId, data.candidate);
      return data.candidate;
    } catch (err) {
      const dossier = await this.fetchCandidate(candidateId);
      dossier.lifecycleStatus = 'NEEDS_CLARIFICATION';
      dossier.reviewerDecision = 'REQUEST_MORE_INFORMATION';
      dossier.reviewAuditTrail = dossier.reviewAuditTrail || [];
      dossier.reviewAuditTrail.push({
        timestamp: new Date().toISOString(),
        reviewer,
        pillar: 'editorial',
        action: 'REQUEST_CLARIFICATION',
        newStatus: 'NEEDS_CLARIFICATION',
        notes,
      });
      this.inMemoryCache.set(candidateId, dossier);
      return dossier;
    }
  }

  /**
   * Phase 6 Feature 1: Explicit Owner Direct Publish command.
   * Bypasses automated gates and publishes directly to production.
   */
  async publishNow(
    candidateId: string,
    owner: string = 'owner'
  ): Promise<{ success: boolean; result?: any; candidate?: CandidateDossier; error?: string; isTechnicalBlocker?: boolean }> {
    try {
      const response = await this.fetchWithAuth(`/api/inbox/candidates/${encodeURIComponent(candidateId)}/publish-now`, {
        method: 'POST',
        body: JSON.stringify({ owner }),
      });
      const data = await this.readJson<any>(response);
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Direct publication failed (HTTP ${response.status}).`,
          isTechnicalBlocker: data.isTechnicalBlocker || false,
        };
      }
      if (data.candidate) {
        this.inMemoryCache.set(candidateId, data.candidate);
      }
      return {
        success: true,
        result: data.result,
        candidate: data.candidate,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Reads the live production catalog straight from the server so a freshly
   * published game can be confirmed as present without waiting for a rebuild.
   */
  async fetchLiveCatalog(): Promise<{ success: boolean; games?: any[]; error?: string }> {
    try {
      const response = await fetch('/api/catalog/games', {
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      const data = await this.readJson<any>(response);
      if (!response.ok) {
        return { success: false, error: data.error || `Catalog lookup failed (HTTP ${response.status}).` };
      }
      return { success: true, games: Array.isArray(data.games) ? data.games : [] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Confirms that a published game is really visible in the production catalog
   * and that its entry point responds. Success is never declared before this passes.
   */
  async verifyPublication(slug: string): Promise<{ verified: boolean; reasons: string[] }> {
    const reasons: string[] = [];
    const entryPath = `/games/${slug}/index.html`;

    const catalog = await this.fetchLiveCatalog();
    if (!catalog.success) {
      reasons.push(catalog.error || 'Production catalog could not be read.');
    } else if (!catalog.games!.some((g: any) => g.slug === slug || g.id === slug)) {
      reasons.push(`Slug "${slug}" is not present in the production catalog.`);
    }

    try {
      const head = await fetch(entryPath, { method: 'HEAD', credentials: 'include' });
      if (!head.ok) {
        reasons.push(`Entry point ${entryPath} responded with HTTP ${head.status}.`);
      }
    } catch (err: any) {
      reasons.push(`Entry point ${entryPath} is unreachable: ${err?.message || 'network error'}`);
    }

    return { verified: reasons.length === 0, reasons };
  }

  /**
   * Phase 6 Feature 2: Fix Issues action.
   * Attempts automated repair in isolated workspace, preserving original files. Never auto-publishes.
   */
  async fixIssues(
    candidateId: string
  ): Promise<{
    success: boolean;
    jobId?: string;
    job?: any;
    repairResult?: any;
    postRepairTests?: any;
    enhancedFiles?: string[];
    agentDivision?: any;
    candidate?: CandidateDossier;
    error?: string;
    message?: string;
  }> {
    try {
      const response = await this.fetchWithAuth(`/api/inbox/candidates/${encodeURIComponent(candidateId)}/fix-issues`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const data = await this.readJson<any>(response);
      if (!response.ok) {
        return { success: false, error: data.error || 'Automated repair failed.' };
      }
      if (data.candidate) {
        this.inMemoryCache.set(candidateId, data.candidate);
      }
      return {
        success: data.success,
        jobId: data.jobId,
        job: data.job,
        repairResult: data.repairResult,
        postRepairTests: data.postRepairTests,
        enhancedFiles: data.enhancedFiles,
        agentDivision: data.agentDivision,
        candidate: data.candidate,
        message: data.message,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Phase 6 Feature 3: Explain & Solve diagnostic retrieval.
   */
  async fetchExplainAndSolve(candidateId: string): Promise<{ success: boolean; analysis?: any; error?: string }> {
    try {
      const response = await this.fetchWithAuth(`/api/inbox/candidates/${encodeURIComponent(candidateId)}/explain-and-solve`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await this.readJson<any>(response);
      return { success: true, analysis: data.analysis };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Phase 6 Feature 3: Resolve specific automatable issue.
   */
  async resolveIssue(
    candidateId: string,
    issueId: string
  ): Promise<{ success: boolean; issueResult?: any; candidate?: CandidateDossier; error?: string }> {
    try {
      const response = await this.fetchWithAuth(`/api/inbox/candidates/${encodeURIComponent(candidateId)}/resolve-issue`, {
        method: 'POST',
        body: JSON.stringify({ issueId }),
      });
      const data = await this.readJson<any>(response);
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to resolve issue.' };
      }
      if (data.candidate) {
        this.inMemoryCache.set(candidateId, data.candidate);
      }
      return { success: true, issueResult: data.issueResult, candidate: data.candidate };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const inboxService = new InboxService();
export default inboxService;

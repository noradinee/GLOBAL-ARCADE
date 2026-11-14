/**
 * adminService.ts
 *
 * Client API service for the GLOBAL-ARCADE Permanent Admin Control Center.
 * Handles authentication, session persistence, engine controls, job monitoring,
 * and game catalog management with CSRF mitigation headers.
 */

const TOKEN_KEY = 'ga_admin_token';

export interface EngineConfig {
  status: 'RUNNING' | 'PAUSED' | 'IDLE' | 'STOPPED';
  workerConcurrency: number;
  pollIntervalSec: number;
  requestDelayMs: number;
  autonomousAcquisition: boolean;
  autonomousRepair: boolean;
  autonomousPublishing: boolean;
  enabledSources: {
    github: boolean;
    gitlab: boolean;
    codeberg: boolean;
    itch: boolean;
    hackernews: boolean;
    openweb: boolean;
  };
  maxCandidatesPerBatch: number;
  retryLimit: number;
  backoffBaseMs: number;
  lastUpdated: string | null;
}

export interface EngineStatus {
  status: 'RUNNING' | 'PAUSED' | 'IDLE' | 'STOPPED';
  isLoopRunning: boolean;
  isDiscovering: boolean;
  lastDiscoveryTime: string | null;
  activeWorkers: number;
  pipelineSummary: {
    total: number;
    byStatus: Record<string, number>;
    byStage: Record<string, number>;
    activeWorkers: number;
  };
  config: EngineConfig;
}

export interface JobRecord {
  id: string;
  candidateId: string;
  candidateName: string;
  sourcePlatform: string;
  originalRepoUrl: string | null;
  exactCommitHash: string | null;
  priority: number;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'INTERRUPTED';
  stage: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number;
  retryCount: number;
  maxRetries: number;
  error: string | null;
  logs: Array<{ timestamp: string; stage: string; message: string }>;
  result?: any;
}

export interface AdminAnalytics {
  volume: {
    totalDiscovered: number;
    authoritativeDossiers: number;
    activePublishedGames: number;
    awaitingOwnerReview: number;
    autoApproved: number;
    rejected: number;
    repairedPatches: number;
  };
  rates: {
    qualificationRatePercent: number;
    autoApprovalRatePercent: number;
    repairSuccessRatePercent: number;
  };
  sourceBreakdown: Record<string, number>;
  estimatedCosts: {
    apiCostsUsd: number;
    bandwidthTier: string;
    monthlyEstimateUsd: number;
  };
}

class AdminService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  private async request(url: string, options: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Admin-Action': '1',
      'X-GA-CSRF-Protection': '1',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      this.setToken(null);
      throw new Error(data.message || data.error || 'Unauthorized: Please log in with administrator credentials.');
    }

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  }

  async login(usernameOrPassword: string, maybePassword?: string): Promise<{ success: boolean; token: string; user?: string; role?: string }> {
    let username = 'admin';
    let password = usernameOrPassword;
    if (maybePassword !== undefined) {
      username = usernameOrPassword;
      password = maybePassword;
    }

    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getSession(): Promise<{ authenticated: boolean; user: string | null; role: string | null }> {
    try {
      return await this.request('/api/auth/session');
    } catch {
      return { authenticated: false, user: null, role: null };
    }
  }

  async getEngineStatus(): Promise<EngineStatus> {
    return this.request('/api/automation/status');
  }

  async startEngine(): Promise<{ success: boolean; status: string }> {
    return this.request('/api/automation/start', { method: 'POST' });
  }

  async pauseEngine(): Promise<{ success: boolean; status: string }> {
    return this.request('/api/automation/pause', { method: 'POST' });
  }

  async resumeEngine(): Promise<{ success: boolean; status: string }> {
    return this.request('/api/automation/resume', { method: 'POST' });
  }

  async stopEngine(): Promise<{ success: boolean; status: string }> {
    return this.request('/api/automation/stop', { method: 'POST' });
  }

  async triggerDiscovery(): Promise<{ success: boolean; message: string }> {
    return this.request('/api/automation/discover', { method: 'POST' });
  }

  async updateConfig(updates: Partial<EngineConfig>): Promise<{ success: boolean; config: EngineConfig }> {
    return this.request('/api/automation/config', {
      method: 'POST',
      body: JSON.stringify(updates),
    });
  }

  async getJobs(params: { status?: string; stage?: string; limit?: number; offset?: number } = {}): Promise<{ jobs: JobRecord[]; total: number }> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.stage) query.set('stage', params.stage);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));

    return this.request(`/api/jobs?${query.toString()}`);
  }

  async cancelJob(jobId: string, reason?: string): Promise<{ success: boolean; job: JobRecord }> {
    return this.request(`/api/jobs/${jobId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async retryJob(jobId: string): Promise<{ success: boolean; job: JobRecord }> {
    return this.request(`/api/jobs/${jobId}/retry`, { method: 'POST' });
  }

  async getGames(): Promise<{ games: any[]; count: number }> {
    return this.request('/api/admin/games');
  }

  async updateGameStatus(slug: string, status: 'active' | 'disabled' | 'unlisted'): Promise<{ success: boolean; game: any }> {
    return this.request(`/api/admin/games/${slug}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  async getAnalytics(): Promise<AdminAnalytics> {
    return this.request('/api/admin/analytics');
  }

  async getAuditLogs(params: { action?: string; limit?: number } = {}): Promise<{ logs: any[]; count: number }> {
    const query = new URLSearchParams();
    if (params.action) query.set('action', params.action);
    if (params.limit) query.set('limit', String(params.limit));
    return this.request(`/api/admin/audit-logs?${query.toString()}`);
  }
}

export const adminService = new AdminService();

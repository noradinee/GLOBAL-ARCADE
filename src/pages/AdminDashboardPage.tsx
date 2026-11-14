import React, { useState, useEffect, useCallback } from 'react';
import {
  adminService,
  EngineStatus,
  JobRecord,
  AdminAnalytics,
  EngineConfig,
} from '../services/adminService';
import { inboxService } from '../services/inboxService';
import { AdminHeader } from '../components/admin/AdminHeader';
import { OverviewTab } from '../components/admin/OverviewTab';
import { AutomationControlsTab } from '../components/admin/AutomationControlsTab';
import { LivePipelineMonitorTab } from '../components/admin/LivePipelineMonitorTab';
import { OwnerReviewCenterTab } from '../components/admin/OwnerReviewCenterTab';
import { GameManagementTab } from '../components/admin/GameManagementTab';
import { AnalyticsTab } from '../components/admin/AnalyticsTab';
import { AdminLoginModal } from '../components/admin/AdminLoginModal';
import {
  Sliders,
  Layers,
  AlertTriangle,
  Gamepad2,
  BarChart3,
  LayoutDashboard,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'automation' | 'monitor' | 'review' | 'games' | 'analytics'>('overview');

  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Check existing session
  useEffect(() => {
    adminService.getSession().then((session) => {
      setIsAuthenticated(session.authenticated);
    });
  }, []);

  const refreshAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [st, jb, an, cd, gm, lg] = await Promise.all([
        adminService.getEngineStatus().catch(() => null),
        adminService.getJobs({ limit: 100 }).catch(() => ({ jobs: [] })),
        adminService.getAnalytics().catch(() => null),
        inboxService.fetchManifest().then(m => m.candidates).catch(() => []),
        adminService.getGames().catch(() => ({ games: [] })),
        adminService.getAuditLogs({ limit: 100 }).catch(() => ({ logs: [] })),
      ]);

      if (st) setEngineStatus(st);
      if (jb?.jobs) setJobs(jb.jobs);
      if (an) setAnalytics(an);
      if (cd) setCandidates(cd);
      if (gm?.games) setGames(gm.games);
      if (lg?.logs) setAuditLogs(lg.logs);
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshAllData();
      const interval = setInterval(refreshAllData, 4000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, refreshAllData]);

  const handleLogin = async (username: string, password: string) => {
    const res = await adminService.login(username, password);
    if (res.success) {
      setIsAuthenticated(true);
      await refreshAllData();
    }
  };

  const handleLogout = async () => {
    await adminService.logout();
    setIsAuthenticated(false);
  };

  const handleStartEngine = async () => {
    await adminService.startEngine();
    await refreshAllData();
  };

  const handlePauseEngine = async () => {
    await adminService.pauseEngine();
    await refreshAllData();
  };

  const handleDiscoverNow = async () => {
    setIsDiscovering(true);
    try {
      await adminService.triggerDiscovery();
      setTimeout(refreshAllData, 1000);
    } finally {
      setTimeout(() => setIsDiscovering(false), 2500);
    }
  };

  const handleSaveConfig = async (updates: Partial<EngineConfig>) => {
    await adminService.updateConfig(updates);
    await refreshAllData();
  };

  const handleCancelJob = async (jobId: string) => {
    await adminService.cancelJob(jobId);
    await refreshAllData();
  };

  const handleRetryJob = async (jobId: string) => {
    await adminService.retryJob(jobId);
    await refreshAllData();
  };

  const handleOwnerAction = async (candidateId: string, action: string, payload: any) => {
    await fetch(`/api/inbox/candidates/${encodeURIComponent(candidateId)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Action': '1',
      },
      body: JSON.stringify({
        action,
        reviewer: payload.reviewer || 'owner',
        notes: payload.notes || payload.justification || payload.reason || '',
      }),
    });
    await refreshAllData();
  };

  const handleToggleGameStatus = async (slug: string, newStatus: 'active' | 'disabled' | 'unlisted') => {
    await adminService.updateGameStatus(slug, newStatus);
    await refreshAllData();
  };

  if (isAuthenticated === null) {
    return <div className="p-12 text-center text-slate-400">Verifying administrator session...</div>;
  }

  if (!isAuthenticated) {
    return <AdminLoginModal onLogin={handleLogin} />;
  }

  interface NavTabItem {
    id: 'overview' | 'automation' | 'monitor' | 'review' | 'games' | 'analytics';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }

  const navTabs: NavTabItem[] = [
    { id: 'overview', label: 'Main Overview', icon: LayoutDashboard },
    { id: 'automation', label: 'Automation & Controls', icon: Sliders },
    { id: 'monitor', label: 'Live Pipeline Monitor', icon: Layers },
    {
      id: 'review',
      label: 'Owner Review Center',
      icon: AlertTriangle,
      badge: candidates.filter(c => c.lifecycleStatus === 'NEEDS_OWNER_REVIEW').length,
    },
    { id: 'games', label: 'Game Management', icon: Gamepad2 },
    { id: 'analytics', label: 'Analytics & Logs', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-dark-950 pb-16">
      {/* Header with Engine Controls */}
      <AdminHeader
        status={engineStatus}
        onStart={handleStartEngine}
        onPause={handlePauseEngine}
        onDiscover={handleDiscoverNow}
        onLogout={handleLogout}
        isDiscovering={isDiscovering}
      />

      {/* Tabs Navigation Bar */}
      <div className="bg-dark-900/60 border-b border-dark-800 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto scrollbar-none">
          {navTabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        {activeTab === 'overview' && (
          <OverviewTab
            analytics={analytics}
            status={engineStatus}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        )}

        {activeTab === 'automation' && (
          <AutomationControlsTab
            config={engineStatus?.config || null}
            onSaveConfig={handleSaveConfig}
          />
        )}

        {activeTab === 'monitor' && (
          <LivePipelineMonitorTab
            jobs={jobs}
            summary={engineStatus?.pipelineSummary}
            onCancelJob={handleCancelJob}
            onRetryJob={handleRetryJob}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === 'review' && (
          <OwnerReviewCenterTab
            candidates={candidates}
            onTakeAction={handleOwnerAction}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === 'games' && (
          <GameManagementTab
            games={games}
            onToggleStatus={handleToggleGameStatus}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            analytics={analytics}
            auditLogs={auditLogs}
            onRefresh={refreshAllData}
          />
        )}
      </div>
    </div>
  );
};

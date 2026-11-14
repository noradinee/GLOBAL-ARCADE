import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  InboxManifest,
  CandidateDossier,
  InboxFilterState,
} from '../types/inbox';
import { inboxService } from '../services/inboxService';
import { adminService } from '../services/adminService';
import { AdminLoginModal } from '../components/admin/AdminLoginModal';
import { InboxSummary } from '../components/inbox/InboxSummary';
import { CandidateFilterBar } from '../components/inbox/CandidateFilterBar';
import { CandidateTable } from '../components/inbox/CandidateTable';
import { CandidateDetailDrawer } from '../components/inbox/CandidateDetailDrawer';
import {
  Inbox,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

const INITIAL_FILTERS: InboxFilterState = {
  searchQuery: '',
  sourcePlatform: 'ALL',
  lifecycleStatus: 'ALL',
  legalStatus: 'ALL',
  rejectionType: 'ALL',
  sortBy: 'discoveryDate',
  sortOrder: 'desc',
};

export const DiscoveryInboxPage: React.FC = () => {
  const { candidateId } = useParams<{ candidateId?: string }>();
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [manifest, setManifest] = useState<InboxManifest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<InboxFilterState>(INITIAL_FILTERS);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDossier | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Load manifest on mount
  const loadManifest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inboxService.fetchManifest();
      setManifest(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load discovery inbox manifest.');
    } finally {
      setLoading(false);
    }
  };

  // Check session on mount
  useEffect(() => {
    adminService.getSession().then((session) => {
      setIsAuthenticated(session.authenticated);
      if (session.authenticated) {
        loadManifest();
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleLogin = async (username: string, password: string) => {
    const res = await adminService.login(username, password);
    if (res.success) {
      setIsAuthenticated(true);
      await loadManifest();
    }
  };

  // Handle URL param deep linking
  useEffect(() => {
    if (candidateId) {
      loadCandidateDetails(candidateId);
    } else {
      setSelectedCandidate(null);
    }
  }, [candidateId]);

  const loadCandidateDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const dossier = await inboxService.fetchCandidate(id);
      setSelectedCandidate(dossier);
    } catch (err: any) {
      console.error('Failed to load candidate details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelectCandidate = (id: string) => {
    navigate(`/inbox/${encodeURIComponent(id)}`);
  };

  const handleCloseDrawer = () => {
    navigate('/inbox');
    setSelectedCandidate(null);
  };

  // Dynamic filter and search
  const filteredCandidates = useMemo(() => {
    if (!manifest) return [];
    let list = [...manifest.candidates];

    // Search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.candidateId.toLowerCase().includes(q) ||
          c.author.toLowerCase().includes(q)
      );
    }

    // Source platform
    if (filters.sourcePlatform !== 'ALL') {
      list = list.filter(
        (c) => c.sourcePlatform.toLowerCase() === filters.sourcePlatform.toLowerCase()
      );
    }

    // Lifecycle status
    if (filters.lifecycleStatus !== 'ALL') {
      if (filters.lifecycleStatus === 'INBOX_PENDING') {
        list = list.filter(
          (c) => c.lifecycleStatus === 'INBOX_PENDING' || c.lifecycleStatus === 'DISCOVERED'
        );
      } else if (filters.lifecycleStatus === 'QUALIFIED') {
        list = list.filter(
          (c) =>
            c.lifecycleStatus === 'QUALIFIED' ||
            c.lifecycleStatus === 'STAGED' ||
            c.lifecycleStatus === 'READY_FOR_IMPORT'
        );
      } else {
        list = list.filter((c) => c.lifecycleStatus === filters.lifecycleStatus);
      }
    }

    // Legal status
    if (filters.legalStatus !== 'ALL') {
      list = list.filter((c) => c.legalStatus === filters.legalStatus);
    }

    // Rejection type
    if (filters.rejectionType !== 'ALL') {
      list = list.filter((c) => c.rejectionType === filters.rejectionType);
    }

    // Sorting
    list.sort((a, b) => {
      let comparison = 0;
      if (filters.sortBy === 'discoveryDate') {
        comparison = (b.discoveryDate || '').localeCompare(a.discoveryDate || '');
      } else if (filters.sortBy === 'totalScore') {
        comparison = (b.totalScore || 0) - (a.totalScore || 0);
      } else if (filters.sortBy === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      }
      return filters.sortOrder === 'asc' ? -comparison : comparison;
    });

    return list;
  }, [manifest, filters]);

  // Gate update handler
  const handleUpdateGate = async (
    pillar: 'technical' | 'security' | 'legal' | 'editorial',
    status: string,
    notes?: string
  ) => {
    if (!selectedCandidate) return;
    const updated = await inboxService.updateGate(selectedCandidate.candidateId, pillar, status, notes);
    setSelectedCandidate(updated);
    await loadManifest();
  };

  // Qualify handler
  const handleQualify = async (notes?: string) => {
    if (!selectedCandidate) return;
    const res = await inboxService.qualifyCandidate(selectedCandidate.candidateId, 'owner', notes);
    if (!res.success) {
      throw new Error(res.error || 'Qualification failed');
    }
    if (res.candidate) setSelectedCandidate(res.candidate);
    await loadManifest();
  };

  // Reject handler
  const handleReject = async (reason: string) => {
    if (!selectedCandidate) return;
    const updated = await inboxService.rejectCandidate(selectedCandidate.candidateId, reason, 'owner');
    setSelectedCandidate(updated);
    await loadManifest();
  };

  // Reopen handler
  const handleReopen = async (reason: string) => {
    if (!selectedCandidate) return;
    const updated = await inboxService.reopenCandidate(selectedCandidate.candidateId, reason, 'owner');
    setSelectedCandidate(updated);
    await loadManifest();
  };

  // Clarification handler
  const handleRequestClarification = async (notes: string) => {
    if (!selectedCandidate) return;
    const updated = await inboxService.requestClarification(selectedCandidate.candidateId, notes, 'owner');
    setSelectedCandidate(updated);
    await loadManifest();
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center text-slate-400 p-8">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-cyan" />
          <span>Verifying administrator session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginModal onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-violet to-brand-cyan shadow-glow-purple text-white">
                <Inbox className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Discovery Inbox
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-dark-800 text-brand-cyan border border-dark-700">
                Phase 2B
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Inspect, evaluate, and qualify discovered HTML5 game candidates. Enforces the four independent qualification gates (Technical, Security, Legal, Editorial). Rejected candidates are permanently preserved for inspection.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={loadManifest}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-dark-900 hover:bg-dark-800 border border-dark-750 text-slate-200 hover:text-white transition-all shadow-sm"
              title="Refresh candidate records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 mb-6 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-rose-200 text-sm flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            {error.includes('Authentication required') && (
              <a
                href="/admin"
                className="px-3.5 py-1.5 rounded-xl bg-brand-violet hover:bg-brand-violet/80 text-white text-xs font-bold transition-all shadow-md shrink-0"
              >
                Log In at Admin
              </a>
            )}
          </div>
        )}

        {/* Summary Dashboard Cards */}
        {manifest && (
          <InboxSummary
            metrics={manifest.metrics}
            selectedStatusFilter={filters.lifecycleStatus}
            onSelectStatusFilter={(status) => setFilters((p) => ({ ...p, lifecycleStatus: status }))}
          />
        )}

        {/* Filter and Search Bar */}
        <CandidateFilterBar
          filters={filters}
          onFilterChange={(newFilters) => setFilters((p) => ({ ...p, ...newFilters }))}
          onResetFilters={() => setFilters(INITIAL_FILTERS)}
          totalFiltered={filteredCandidates.length}
        />

        {/* Candidate List / Table */}
        <CandidateTable
          candidates={filteredCandidates}
          onSelectCandidate={handleSelectCandidate}
          selectedCandidateId={selectedCandidate?.candidateId}
        />

        {/* Candidate Detail Inspection Drawer */}
        {loadingDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm text-slate-100 text-sm font-bold">
            <div className="bg-dark-900 border border-dark-750 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-cyan" />
              <span>Loading candidate dossier...</span>
            </div>
          </div>
        )}

        {selectedCandidate && (
          <CandidateDetailDrawer
            candidate={selectedCandidate}
            onClose={handleCloseDrawer}
            onUpdateGate={handleUpdateGate}
            onQualify={handleQualify}
            onReject={handleReject}
            onReopen={handleReopen}
            onRequestClarification={handleRequestClarification}
          />
        )}
      </div>
    </div>
  );
};

export default DiscoveryInboxPage;

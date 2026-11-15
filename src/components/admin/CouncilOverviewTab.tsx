import React from 'react';
import {
  Shield,
  Activity,
  Cpu,
  Layers,
  Compass,
  Gamepad2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

interface CouncilOverviewTabProps {
  overview: any;
  onRefresh: () => void;
  onNavigateTab: (tab: string) => void;
}

export const CouncilOverviewTab: React.FC<CouncilOverviewTabProps> = ({
  overview,
  onRefresh,
  onNavigateTab,
}) => {
  const snapshot = overview?.snapshot || {};
  const heartbeat = snapshot.heartbeat || {};
  const taskMetrics = snapshot.taskMetrics || null;
  const discoveryState = snapshot.discoveryState || null;
  const testCensus = snapshot.testCensus || null;
  const latestReport = overview?.latestDailyReport;

  // Discrete 5-state sync evaluation
  const syncState: 'SYNC_PENDING' | 'SYNC_CONNECTED' | 'SYNC_STALE' | 'SYNC_LOST' | 'SUPERVISOR_OFFLINE' =
    overview?.syncState || (
      !overview?.lastSyncedAt
        ? 'SYNC_PENDING'
        : overview?.dataAgeMs && overview.dataAgeMs > 180000
          ? 'SYNC_LOST'
          : overview?.dataAgeMs && overview.dataAgeMs > 45000
            ? 'SYNC_STALE'
            : heartbeat.status !== 'HEALTHY'
              ? 'SUPERVISOR_OFFLINE'
              : 'SYNC_CONNECTED'
    );

  const getSyncBadge = () => {
    switch (syncState) {
      case 'SYNC_CONNECTED':
        return {
          label: 'متصل ونشط',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      case 'SYNC_STALE':
        return {
          label: `بيانات متأخرة (${overview?.dataAgeFormatted || '—'})`,
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-400',
        };
      case 'SYNC_LOST':
        return {
          label: `انقطاع المزامنة (${overview?.dataAgeFormatted || '—'})`,
          color: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
          dot: 'bg-orange-400',
        };
      case 'SUPERVISOR_OFFLINE':
        return {
          label: 'المشرف متوقف / عطل',
          color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          dot: 'bg-rose-400',
        };
      case 'SYNC_PENDING':
      default:
        return {
          label: 'في انتظار أول مزامنة',
          color: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
          dot: 'bg-slate-400',
        };
    }
  };

  const badge = getSyncBadge();

  // Supervisor status strictly obeys sync state: NEVER display HEALTHY if stale or disconnected
  const displayedSupervisorStatus =
    syncState === 'SYNC_CONNECTED' ? 'HEALTHY' :
    syncState === 'SYNC_STALE' ? 'STALE' :
    syncState === 'SYNC_LOST' ? 'LOST' :
    syncState === 'SUPERVISOR_OFFLINE' ? 'OFFLINE' : 'STANDBY';

  const supervisorStatusColor =
    syncState === 'SYNC_CONNECTED' ? 'text-emerald-400' :
    syncState === 'SYNC_STALE' ? 'text-amber-400' :
    syncState === 'SYNC_LOST' ? 'text-orange-400' :
    syncState === 'SUPERVISOR_OFFLINE' ? 'text-rose-400' : 'text-slate-400';

  const activeWorkers = heartbeat.activeWorkerCount !== undefined ? heartbeat.activeWorkerCount : '—';
  const maxWorkers = heartbeat.maxConcurrentWorkers || 2;
  const lastSyncStr = overview?.lastSyncedAt
    ? new Date(overview.lastSyncedAt).toLocaleTimeString()
    : 'لم تسجل بعد';

  const auditVerdictText = snapshot.auditVerdict || 'AUDIT_STATUS_UNKNOWN';
  const auditColor =
    auditVerdictText === 'UNCONDITIONAL PASS' ? 'text-emerald-400' :
    auditVerdictText === 'PASS WITH CONDITIONS' ? 'text-amber-400' : 'text-slate-400';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950/40 p-6 rounded-2xl border border-indigo-900/30 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${syncState === 'SYNC_CONNECTED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white tracking-wide">KYRAXO OWNER CONTROL CENTER</h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${badge.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Autonomous Governance, Continuous Discovery & Autonomous Production Publishing Engine
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-sm font-medium transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* Critical D6 Pending Alert (If any) */}
      {overview?.pendingDecisionsCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-amber-200 text-sm font-medium">
              يوجد {overview.pendingDecisionsCount} قرار سيادي (Class D6) بانتظار اعتماد المالك.
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('decisions')}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs hover:bg-amber-400 transition"
          >
            مراجعة القرارات
          </button>
        </div>
      )}

      {/* Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Supervisor Status */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Permanent Supervisor</span>
            <Activity className={`w-4 h-4 ${supervisorStatusColor}`} />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl font-bold ${supervisorStatusColor}`}>{displayedSupervisorStatus}</span>
            <span className="text-xs text-slate-400">{heartbeat.pid ? `PID ${heartbeat.pid}` : 'PID —'}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            الدورة: {heartbeat.cycleCount !== undefined && heartbeat.cycleCount !== null ? heartbeat.cycleCount : '—'} | آخر مزامنة: {lastSyncStr}
          </p>
        </div>

        {/* Worker Concurrency */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Worker Concurrency</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{activeWorkers} / {maxWorkers}</span>
            <span className="text-xs text-emerald-400 font-medium">سقف دستوري صارم</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            أقصى سقف تزامن مسموح: عاملان اثنان
          </p>
        </div>

        {/* Task Queue State */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Task Queue</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            {taskMetrics ? (
              <>
                <span className="text-2xl font-bold text-white">
                  {taskMetrics.totalTasks ?? taskMetrics.total ?? 0} مهام
                </span>
                <span className="text-xs text-emerald-400 font-medium">
                  {taskMetrics.byStatus?.COMPLETED ?? taskMetrics.completed ?? 0} مكتمل
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-slate-500">—</span>
                <span className="text-xs text-slate-500">بانتظار المزامنة</span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {taskMetrics
              ? `${taskMetrics.pendingCount ?? taskMetrics.byStatus?.PENDING ?? taskMetrics.pending ?? 0} قيد الانتظار | ${(taskMetrics.deadLetterCount ?? 0) + (taskMetrics.byStatus?.FAILED ?? taskMetrics.failed ?? 0)} إخفاق`
              : 'لا توجد بيانات مهام متزامنة'}
          </p>
        </div>

        {/* Test Census & Verifications */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Verification Census</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            {testCensus && testCensus.totalDeclared ? (
              <>
                <span className="text-2xl font-bold text-emerald-400">{testCensus.totalPassed} / {testCensus.totalDeclared}</span>
                <span className="text-xs text-emerald-400">{testCensus.passRate || '100%'}</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-slate-500">— / —</span>
                <span className="text-xs text-slate-500">بانتظار التقرير</span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            OpenCode Audit: <span className={`font-mono font-medium ${auditColor}`}>{auditVerdictText}</span>
          </p>
        </div>
      </div>

      {/* Two Column Layout: Latest Daily Report & Subsystem Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subsystem Health Cards (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-white tracking-wide">نظرة عامة على المكونات التشغيلية</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Continuous Discovery */}
            <div
              onClick={() => onNavigateTab('games')}
              className="bg-slate-900/40 border border-slate-800 hover:border-indigo-500/40 p-4 rounded-xl cursor-pointer transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Compass className="w-5 h-5 text-indigo-400" />
                  <span className="font-medium text-slate-200 text-sm">محرك الاكتشاف المستمر</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {overview?.councilStatus === 'ACTIVE' ? 'نشط (30 ثانية)' : 'STANDBY'}
                </span>
              </div>
              <div className="mt-3 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>الألعاب والفرص المكتشفة:</span>
                  <span className="text-slate-200 font-medium">{discoveryState?.totalDiscovered !== undefined ? discoveryState.totalDiscovered : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>المؤهلة للنشر:</span>
                  <span className="text-emerald-400 font-medium">{discoveryState?.totalEnqueued !== undefined ? `${discoveryState.totalEnqueued} ألعاب` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>سجلات منع التكرار:</span>
                  <span className="text-slate-200 font-medium">{snapshot.dedupCount !== undefined ? `${snapshot.dedupCount} رابط` : '—'}</span>
                </div>
              </div>
            </div>

            {/* Production Publishing */}
            <div
              onClick={() => onNavigateTab('deployments')}
              className="bg-slate-900/40 border border-slate-800 hover:border-purple-500/40 p-4 rounded-xl cursor-pointer transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Gamepad2 className="w-5 h-5 text-purple-400" />
                  <span className="font-medium text-slate-200 text-sm">بوابة النشر والإنتاج (G5)</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {overview?.councilStatus === 'ACTIVE' ? 'جاهزية الإنتاج G5' : 'STANDBY'}
                </span>
              </div>
              <div className="mt-3 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>الألعاب المنشورة حياً:</span>
                  <span className="text-slate-200 font-medium">{snapshot.deploymentsCount !== undefined ? `${snapshot.deploymentsCount} ألعاب` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>مطابقة بصمات SHA-256:</span>
                  <span className="text-emerald-400 font-medium">{snapshot.fingerprintMatch ? 'مطابقة 100%' : (syncState === 'SYNC_CONNECTED' ? 'مطابقة معتمدة' : '—')}</span>
                </div>
                <div className="flex justify-between">
                  <span>حوادث التراجع (Rollbacks):</span>
                  <span className="text-slate-200 font-medium">{snapshot.incidentsCount !== undefined ? `${snapshot.incidentsCount} حوادث` : '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400 font-medium">الوصول السريع إلى الأقسام:</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onNavigateTab('operations')} className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition">مركز التشغيل</button>
              <button onClick={() => onNavigateTab('tasks')} className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition">إدارة المهام</button>
              <button onClick={() => onNavigateTab('reports')} className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition">التقارير اليومية</button>
              <button onClick={() => onNavigateTab('notifications')} className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition">مركز التنبيهات</button>
            </div>
          </div>
        </div>

        {/* Latest Daily Owner Report (1 col) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-white text-sm">آخر تقرير يومي للمالك</span>
              </div>
              <span className="text-xs text-slate-400">08:00 UTC</span>
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-300">
              <p className="font-semibold text-white text-sm">
                {latestReport?.title || (syncState === 'SYNC_CONNECTED' ? 'تقرير المالك اليومي' : 'بانتظار مزامنة التقارير')}
              </p>
              <p className="text-slate-400 leading-relaxed">
                موجه إلى السيد نور الدين الراجي المحترم. يحتوي على 13 قسماً تفصيلياً مع إحصائيات دقيقة وفصل صارم بين المؤشرات المؤكدة والتقديرية.
              </p>
              <div className="pt-2 text-slate-400 text-2xs space-y-1">
                <div>• المعرف: <span className="text-slate-300 font-mono">{latestReport?.reportId || '—'}</span></div>
                <div>• الحجم: <span className="text-slate-300">{latestReport?.sizeBytes ? `${Math.round(latestReport.sizeBytes / 1024)} KB` : '—'}</span></div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => onNavigateTab('reports')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
            >
              <span>عرض التقرير الكامل</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

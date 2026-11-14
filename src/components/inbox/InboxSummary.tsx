import React from 'react';
import { InboxMetrics } from '../../types/inbox';
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface InboxSummaryProps {
  metrics: InboxMetrics;
  selectedStatusFilter: string;
  onSelectStatusFilter: (status: string) => void;
}

export const InboxSummary: React.FC<InboxSummaryProps> = ({
  metrics,
  selectedStatusFilter,
  onSelectStatusFilter,
}) => {
  const pendingCount =
    (metrics.byStatus?.INBOX_PENDING || 0) + (metrics.byStatus?.DISCOVERED || 0);
  const qualifiedCount =
    (metrics.byStatus?.QUALIFIED || 0) +
    (metrics.byStatus?.STAGED || 0) +
    (metrics.byStatus?.READY_FOR_IMPORT || 0);
  const rejectedCount = metrics.byStatus?.REJECTED || 0;
  const clarificationCount = metrics.byStatus?.NEEDS_CLARIFICATION || 0;
  const totalCount = metrics.totalCandidates || 0;

  const cards = [
    {
      id: 'ALL',
      title: 'Total Discovered',
      count: totalCount,
      icon: Inbox,
      color: 'from-brand-violet to-brand-cyan',
      textColor: 'text-brand-cyan',
      borderColor: 'border-dark-700',
      activeBorder: 'border-brand-cyan',
      filterValue: 'ALL',
    },
    {
      id: 'INBOX_PENDING',
      title: 'Pending Review',
      count: pendingCount,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
      activeBorder: 'border-amber-400',
      filterValue: 'INBOX_PENDING',
    },
    {
      id: 'QUALIFIED',
      title: 'Qualified Candidates',
      count: qualifiedCount,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-emerald-600',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/20',
      activeBorder: 'border-emerald-400',
      filterValue: 'QUALIFIED',
    },
    {
      id: 'REJECTED',
      title: 'Rejected (Preserved)',
      count: rejectedCount,
      icon: XCircle,
      color: 'from-rose-500 to-rose-600',
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500/20',
      activeBorder: 'border-rose-400',
      filterValue: 'REJECTED',
      badge: metrics.byRejectionType
        ? `${metrics.byRejectionType.AUTOMATED_SCREENING || 0} Auto / ${metrics.byRejectionType.HUMAN_REVIEW || 0} Human`
        : undefined,
    },
    {
      id: 'NEEDS_CLARIFICATION',
      title: 'Needs Clarification',
      count: clarificationCount,
      icon: HelpCircle,
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-400',
      borderColor: 'border-purple-500/20',
      activeBorder: 'border-purple-400',
      filterValue: 'NEEDS_CLARIFICATION',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedStatusFilter === card.filterValue;

        return (
          <button
            key={card.id}
            onClick={() => onSelectStatusFilter(card.filterValue)}
            className={`flex flex-col text-left p-4 rounded-2xl bg-dark-900/80 backdrop-blur-sm border transition-all hover:scale-[1.02] cursor-pointer ${
              isSelected
                ? `${card.activeBorder} shadow-lg ring-1 ring-brand-purple/50 bg-dark-850`
                : `${card.borderColor} hover:border-dark-600`
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl bg-dark-800 ${card.textColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-black ${card.textColor}`}>
                {card.count}
              </span>
            </div>

            {card.badge && (
              <span className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                {card.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

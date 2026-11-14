import React from 'react';
import { InboxFilterState } from '../../types/inbox';
import {
  Search,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';

interface CandidateFilterBarProps {
  filters: InboxFilterState;
  onFilterChange: (newFilters: Partial<InboxFilterState>) => void;
  onResetFilters: () => void;
  totalFiltered: number;
}

export const CandidateFilterBar: React.FC<CandidateFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  totalFiltered,
}) => {
  return (
    <div className="bg-dark-900/90 border border-dark-750/80 rounded-2xl p-4 mb-6 shadow-md">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search by candidate name, author, or ID..."
            className="w-full bg-dark-950/80 border border-dark-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-all"
          />
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-center">
          
          {/* Source Platform Filter */}
          <select
            value={filters.sourcePlatform}
            onChange={(e) => onFilterChange({ sourcePlatform: e.target.value })}
            className="bg-dark-950/80 border border-dark-700/80 text-xs font-semibold text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-purple"
          >
            <option value="ALL">All Sources</option>
            <option value="github">GitHub</option>
            <option value="gitlab">GitLab</option>
            <option value="codeberg">Codeberg</option>
            <option value="itch.io">itch.io</option>
          </select>

          {/* Lifecycle Status Filter */}
          <select
            value={filters.lifecycleStatus}
            onChange={(e) => onFilterChange({ lifecycleStatus: e.target.value })}
            className="bg-dark-950/80 border border-dark-700/80 text-xs font-semibold text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-purple"
          >
            <option value="ALL">All Lifecycles</option>
            <option value="INBOX_PENDING">Pending Review</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="REJECTED">Rejected</option>
            <option value="NEEDS_CLARIFICATION">Needs Clarification</option>
          </select>

          {/* Legal Status Filter */}
          <select
            value={filters.legalStatus}
            onChange={(e) => onFilterChange({ legalStatus: e.target.value })}
            className="bg-dark-950/80 border border-dark-700/80 text-xs font-semibold text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-purple"
          >
            <option value="ALL">All Legal Gates</option>
            <option value="CLEARED_COMMERCIAL">Cleared Commercial</option>
            <option value="ATTRIBUTION_REQUIRED">Attribution Required</option>
            <option value="LICENSE_PENDING">License Pending</option>
            <option value="RESTRICTED">Restricted / Copyleft</option>
          </select>

          {/* Rejection Category Filter */}
          <select
            value={filters.rejectionType}
            onChange={(e) => onFilterChange({ rejectionType: e.target.value })}
            className="bg-dark-950/80 border border-dark-700/80 text-xs font-semibold text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-purple"
          >
            <option value="ALL">All Rejections</option>
            <option value="AUTOMATED_SCREENING">Automated Screening</option>
            <option value="HUMAN_REVIEW">Human Review</option>
          </select>
        </div>

        {/* Sort Controls & Reset */}
        <div className="flex items-center gap-2 justify-end">
          <div className="flex items-center bg-dark-950/80 border border-dark-700/80 rounded-xl px-2 py-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ sortBy: e.target.value as any })}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer py-1"
            >
              <option value="discoveryDate" className="bg-dark-900">Discovery Date</option>
              <option value="totalScore" className="bg-dark-900">Review Score</option>
              <option value="name" className="bg-dark-900">Title</option>
            </select>
            <button
              onClick={() => onFilterChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
              className="ml-1 text-[11px] font-bold text-brand-cyan hover:text-white px-1.5 py-0.5 rounded"
              title="Toggle sort direction"
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-dark-800 hover:bg-dark-700 border border-dark-700 transition-colors"
            title="Reset all filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Filter status row */}
      <div className="mt-3 pt-3 border-t border-dark-800/80 flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing <span className="font-bold text-slate-200">{totalFiltered}</span> matching candidate(s)
        </div>
        {(filters.searchQuery ||
          filters.sourcePlatform !== 'ALL' ||
          filters.lifecycleStatus !== 'ALL' ||
          filters.legalStatus !== 'ALL' ||
          filters.rejectionType !== 'ALL') && (
          <span className="text-[11px] text-brand-purple font-medium">
            Active filters applied
          </span>
        )}
      </div>
    </div>
  );
};

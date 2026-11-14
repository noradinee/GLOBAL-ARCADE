import React, { useState } from 'react';
import { Gamepad2, Search, Power, PowerOff, ExternalLink } from 'lucide-react';

interface GameManagementTabProps {
  games: any[];
  onToggleStatus: (slug: string, newStatus: 'active' | 'disabled' | 'unlisted') => Promise<void>;
  onRefresh: () => void;
}

export const GameManagementTab: React.FC<GameManagementTabProps> = ({
  games,
  onToggleStatus,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [updatingSlug, setUpdatingSlug] = useState<string | null>(null);

  const filteredGames = games.filter((g) => {
    const matchesSearch =
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.slug.toLowerCase().includes(search.toLowerCase()) ||
      (g.category && g.category.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = filterStatus === 'all' || g.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleToggle = async (slug: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'disabled' : 'active';
    setUpdatingSlug(slug);
    try {
      await onToggleStatus(slug, nextStatus);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingSlug(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-purple-400" />
            Production Games Catalog Management ({games.length})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage live public games. Disabling or unpublishing a game preserves its complete source dossier, patch receipts, and historical audit records permanently.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search title, slug, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-dark-950 border border-dark-750 text-xs text-slate-200 rounded-xl pl-9 pr-3 py-2 w-64 focus:outline-none focus:border-primary-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-dark-950 border border-dark-750 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-primary-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="disabled">Disabled Only</option>
            <option value="unlisted">Unlisted Only</option>
          </select>
        </div>
      </div>

      {/* Games Table */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl shadow-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-dark-950/80 border-b border-dark-800 text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Game</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Author</th>
              <th className="py-3.5 px-4">License</th>
              <th className="py-3.5 px-4">Published</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800/80 text-slate-300">
            {filteredGames.map((game) => {
              const isActive = game.status === 'active';
              return (
                <tr key={game.slug} className="hover:bg-dark-850/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-dark-950 border border-dark-800 flex items-center justify-center font-bold text-primary-400">
                        {game.title.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          {game.title}
                          {game.featured && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300">
                              FEATURED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">{game.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 capitalize">{game.category || 'arcade'}</td>
                  <td className="py-3.5 px-4 font-mono">{game.author || 'Open Source'}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-dark-950 border border-dark-800 font-mono text-[11px]">
                      {game.license || 'MIT'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{game.publishedDate || '2026'}</td>
                  <td className="py-3.5 px-4">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        DISABLED
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/game/${game.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Play in public arcade"
                        className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-slate-200 border border-dark-700 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => handleToggle(game.slug, game.status)}
                        disabled={updatingSlug === game.slug}
                        title={isActive ? 'Disable game' : 'Enable game'}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isActive
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

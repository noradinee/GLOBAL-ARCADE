import React, { useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { AVATAR_OPTIONS } from '../../data/badges';
import { ProfileModal } from './ProfileModal';
import { Flame, Zap } from 'lucide-react';

export const PlayerStatusWidget: React.FC = () => {
  const { profile } = useProfile();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentAvatar = AVATAR_OPTIONS.find((a) => a.id === profile.avatarId) || AVATAR_OPTIONS[0];

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-700/80 hover:border-brand-purple/50 transition-all text-xs focus:outline-none group"
        title="View Player Profile & Achievements"
      >
        {/* Avatar */}
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${currentAvatar.gradient} flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition-transform`}>
          <span>{currentAvatar.emoji}</span>
        </div>

        {/* Tag & Level */}
        <div className="hidden sm:flex flex-col text-left rtl:text-right">
          <span className="font-bold text-slate-100 group-hover:text-brand-cyan transition-colors leading-tight max-w-[90px] truncate">
            {profile.gamerTag}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center text-brand-neon">
              <Zap className="w-2.5 h-2.5" />
              L{profile.level}
            </span>
            <span className="flex items-center text-brand-amber">
              <Flame className="w-2.5 h-2.5" />
              {profile.streak.currentDays}d
            </span>
          </div>
        </div>
      </button>

      {/* Profile Modal */}
      <ProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

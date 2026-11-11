import React from 'react';
import { useProfile } from '../../context/ProfileContext';
import { useLanguage } from '../../context/LanguageContext';
import { Target, CheckCircle2, Flame, Zap, Sparkles } from 'lucide-react';

export const DailyChallengeWidget: React.FC = () => {
  const { profile } = useProfile();
  const { lang } = useLanguage();

  const challenges = profile.dailyChallenges || [];
  const completedCount = challenges.filter((c) => c.completed).length;

  return (
    <div className="bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-750/90 rounded-3xl p-5 sm:p-6 my-8 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dark-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">
                {lang === 'ar' ? 'تحديات اليوم والجوائز' : 'Daily Challenges & Quests'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-cyan text-[11px] font-bold border border-brand-purple/30">
                {completedCount} / {challenges.length} Done
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {lang === 'ar'
                ? 'أكمل مهامك اليومية لترقية مستواك وكسب نقاط الـ XP'
                : 'Complete daily tasks to level up your gamer profile and earn bonus XP'}
            </p>
          </div>
        </div>

        {/* Streak Counter Banner */}
        <div className="flex items-center gap-2 self-start sm:self-center px-3.5 py-1.5 rounded-2xl bg-dark-800 border border-brand-amber/30 text-xs">
          <Flame className="w-4 h-4 text-brand-amber animate-pulse" />
          <span className="font-extrabold text-white">
            {profile.streak.currentDays} {lang === 'ar' ? 'أيام متتالية' : 'Day Streak'}
          </span>
          <span className="text-[10px] text-slate-400">
            {lang === 'ar' ? '(بونص نشط)' : '(Active Boost)'}
          </span>
        </div>
      </div>

      {/* Challenge Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4">
        {challenges.map((c) => {
          const title = lang === 'ar' ? c.titleAr : c.title;
          const desc = lang === 'ar' ? c.descriptionAr : c.description;
          const progressPercent = Math.min(100, Math.floor((c.current / c.target) * 100));

          return (
            <div
              key={c.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                c.completed
                  ? 'bg-brand-emerald/10 border-brand-emerald/40'
                  : 'bg-dark-900 border-dark-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    {c.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-emerald" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                    )}
                    <span>{title}</span>
                  </h4>
                  <span className="text-[10px] font-mono text-brand-neon font-bold flex items-center gap-0.5">
                    <Zap className="w-3 h-3 text-brand-neon" />
                    +{c.xpReward} XP
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{desc}</p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{c.completed ? 'Completed' : 'In Progress'}</span>
                  <span>
                    {c.current} / {c.target}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      c.completed
                        ? 'bg-brand-emerald'
                        : 'bg-gradient-to-r from-brand-purple to-brand-cyan'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

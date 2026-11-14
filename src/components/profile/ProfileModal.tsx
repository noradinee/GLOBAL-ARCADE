import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useProfile } from '../../context/ProfileContext';
import { useLanguage } from '../../context/LanguageContext';
import { AVATAR_OPTIONS, BADGE_DEFINITIONS } from '../../data/badges';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import {
  X,
  Edit2,
  Check,
  Flame,
  Zap,
  Award,
  Gamepad2,
  Lock,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { profile, setGamerTag, setAvatarId, xpProgressPercent, nextLevelXp } = useProfile();
  const { lang } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [tagInput, setTagInput] = useState(profile.gamerTag);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Universal modal dismiss hook: handles Escape, backdrop click, body scroll lock/unlock
  const { handleBackdropClick } = useModalDismiss({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnBackdrop: true,
    lockBodyScroll: true,
  });

  if (!isOpen || !mounted) return null;

  const currentAvatar = AVATAR_OPTIONS.find((a) => a.id === profile.avatarId) || AVATAR_OPTIONS[0];

  const handleSaveTag = () => {
    if (tagInput.trim()) {
      setGamerTag(tagInput.trim());
      setIsEditingTag(false);
    }
  };

  const unlockedBadgeIds = new Set(profile.badges.map((b) => b.id));

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-fadeIn"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'ar' ? 'ملف اللاعب والإنجازات' : 'Player Profile & Achievements'}
    >
      <div
        className="relative w-full max-w-2xl bg-dark-900 border border-dark-700/80 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header Bar - Always visible regardless of scroll position */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-dark-900/95 backdrop-blur-md border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-purple/20 text-brand-cyan border border-brand-purple/30">
              <Award className="w-5 h-5 text-brand-rose" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {lang === 'ar' ? 'ملف اللاعب والأوسمة' : 'Player Profile & Achievements'}
              </h2>
              <p className="text-xs text-slate-400">
                {profile.gamerTag} • LVL {profile.level}
              </p>
            </div>
          </div>

          {/* Prominent High-Contrast Close Button */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-700 hover:border-brand-purple/50 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-brand-purple cursor-pointer"
            aria-label={lang === 'ar' ? 'إغلاق النافذة' : 'Close Modal'}
            title={lang === 'ar' ? 'إغلاق (Esc)' : 'Close (Esc)'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body with Clean Visible Scrollbar */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Profile Overview Header */}
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-dark-800">
            {/* Avatar Icon */}
            <div className={`relative w-20 h-20 rounded-3xl bg-gradient-to-tr ${currentAvatar.gradient} flex items-center justify-center text-4xl shadow-glow-purple shrink-0`}>
              <span>{currentAvatar.emoji}</span>
              <div className="absolute -bottom-2 -right-1 px-2 py-0.5 rounded-full bg-dark-950 text-brand-neon font-black text-xs border border-brand-cyan/40">
                LVL {profile.level}
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left rtl:sm:text-right">
              {/* Editable Gamer Tag */}
              <div className="flex items-center justify-center sm:justify-start rtl:sm:justify-start gap-2 mb-1.5">
                {isEditingTag ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      maxLength={16}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTag();
                        if (e.key === 'Escape') setIsEditingTag(false);
                      }}
                      className="bg-dark-800 text-white font-black text-lg px-2.5 py-1 rounded-xl border border-brand-purple focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveTag}
                      className="p-1.5 rounded-lg bg-brand-emerald text-white hover:opacity-90 cursor-pointer"
                      title={lang === 'ar' ? 'حفظ' : 'Save'}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      {profile.gamerTag}
                    </h2>
                    <button
                      onClick={() => {
                        setTagInput(profile.gamerTag);
                        setIsEditingTag(true);
                      }}
                      className="text-slate-400 hover:text-brand-cyan transition-colors cursor-pointer"
                      title={lang === 'ar' ? 'تعديل الاسم' : 'Edit Tag'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Level & XP Progress Bar */}
              <div className="space-y-1.5 max-w-sm">
                <div className="flex justify-between text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1 text-brand-cyan">
                    <Zap className="w-3.5 h-3.5" />
                    {lang === 'ar' ? `المستوى ${profile.level}` : `Level ${profile.level}`}
                  </span>
                  <span>
                    {profile.xp} / {nextLevelXp} XP ({xpProgressPercent}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-dark-800 rounded-full overflow-hidden p-0.5 border border-dark-700/60">
                  <div
                    className="h-full bg-gradient-to-r from-brand-purple to-brand-cyan rounded-full transition-all duration-500"
                    style={{ width: `${xpProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex sm:flex-col items-center gap-2 sm:gap-1.5 shrink-0 bg-dark-850 p-3 rounded-2xl border border-dark-750">
              <div className="flex items-center gap-1.5 text-brand-amber font-extrabold text-sm">
                <Flame className="w-4 h-4" />
                <span>
                  {profile.streak.currentDays} {lang === 'ar' ? 'أيام متتالية' : 'Day Streak'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                {lang === 'ar' ? `أطول سلسلة: ${profile.streak.longestStreak}` : `Longest: ${profile.streak.longestStreak} days`}
              </span>
            </div>
          </div>

          {/* Section 1: Choose Avatar */}
          <div className="py-2 border-b border-dark-800 pb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
              {lang === 'ar' ? 'اختر شخصيتك الرمزية' : 'Choose Your Avatar'}
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  key={av.id}
                  onClick={() => setAvatarId(av.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all cursor-pointer ${
                    profile.avatarId === av.id
                      ? 'border-brand-purple bg-brand-purple/20 scale-105 shadow-glow-purple'
                      : 'border-dark-800 bg-dark-850/80 hover:border-dark-700'
                  }`}
                >
                  <span className="text-2xl">{av.emoji}</span>
                  <span className="text-[10px] text-slate-300 font-bold mt-1 truncate max-w-full">
                    {av.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Achievements & Badges */}
          <div className="py-2 border-b border-dark-800 pb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-brand-rose" />
                <span>{lang === 'ar' ? 'الأوسمة والإنجازات' : 'Badges & Achievements'}</span>
              </h3>
              <span className="text-xs font-bold text-slate-400">
                {profile.badges.length} / {BADGE_DEFINITIONS.length}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {BADGE_DEFINITIONS.map((badge) => {
                const isUnlocked = unlockedBadgeIds.has(badge.id);
                const name = lang === 'ar' ? badge.nameAr : badge.name;
                const desc = lang === 'ar' ? badge.descriptionAr : badge.description;

                return (
                  <div
                    key={badge.id}
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-between gap-1.5 transition-all ${
                      isUnlocked
                        ? 'border-brand-purple/50 bg-brand-purple/10'
                        : 'border-dark-800 bg-dark-950/60 opacity-50'
                    }`}
                  >
                    <div className="relative my-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                        isUnlocked ? 'bg-gradient-to-tr from-brand-violet to-brand-cyan text-white shadow-md' : 'bg-dark-800 text-slate-600'
                      }`}>
                        {isUnlocked ? <Award className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white truncate max-w-[120px]">{name}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{desc}</p>
                    </div>

                    <span className="text-[10px] font-mono text-brand-cyan">+{badge.xpValue} XP</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Gameplay History & High Scores */}
          <div className="pt-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-brand-emerald" />
              <span>{lang === 'ar' ? 'سجل الألعاب السابقة' : 'Recently Played Games'}</span>
            </h3>

            {profile.history.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {profile.history.slice(0, 5).map((item) => (
                  <div
                    key={item.gameId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-dark-850 border border-dark-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white capitalize">{item.gameId.replace(/-/g, ' ')}</span>
                      <span className="text-slate-500">
                        {lang === 'ar' ? `لُعبت ${item.playCount} مرة` : `Played ${item.playCount}x`}
                      </span>
                    </div>

                    {profile.highScores[item.gameId] !== undefined && (
                      <span className="font-mono text-brand-amber font-bold">
                        {lang === 'ar' ? 'أعلى نتيجة: ' : 'Best: '}
                        {profile.highScores[item.gameId]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {lang === 'ar' ? 'لم تلعب أي لعبة بعد. اختر لعبة من الصفحة الرئيسية وابدأ الآن!' : 'No gameplay sessions yet. Pick a game from the home page to start!'}
              </p>
            )}
          </div>
        </div>

        {/* Sticky Footer Action Bar */}
        <div className="sticky bottom-0 z-20 flex items-center justify-between px-6 py-3.5 bg-dark-900/95 backdrop-blur-md border-t border-dark-800">
          <span className="text-xs text-slate-500 hidden sm:inline">
            {lang === 'ar' ? 'اضغط Esc أو انقر بالخارج للإغلاق' : 'Press Esc or click outside to close'}
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-white font-bold text-xs border border-dark-700 hover:border-brand-purple/50 transition-colors shadow-sm cursor-pointer"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

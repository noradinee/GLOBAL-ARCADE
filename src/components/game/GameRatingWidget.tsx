import React from 'react';
import { useProfile } from '../../context/ProfileContext';
import { useLanguage } from '../../context/LanguageContext';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface GameRatingWidgetProps {
  gameId: string;
}

const REACTION_TAGS = [
  { id: 'addictive', label: '🔥 Addictive', labelAr: '🔥 إدمانية' },
  { id: 'fast', label: '⚡ Fast Paced', labelAr: '⚡ سرعة جنونية' },
  { id: 'brain', label: '🧠 Brain Melter', labelAr: '🧠 ذكاء وتحدي' },
  { id: 'relaxing', label: '😌 Relaxing', labelAr: '😌 مهدئة ومسلية' },
  { id: 'retro', label: '🎮 Pure Nostalgia', labelAr: '🎮 نوستالجيا كلاسيك' },
];

export const GameRatingWidget: React.FC<GameRatingWidgetProps> = ({ gameId }) => {
  const { profile, setReaction, toggleReactionTag } = useProfile();
  const { lang } = useLanguage();

  const currentReaction = profile.reactions[gameId];
  const selectedTags = profile.selectedReactionTags[gameId] || [];

  return (
    <div className="bg-dark-900 border border-dark-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Thumbs Up / Down */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-slate-300">
          {lang === 'ar' ? 'ما رأيك بهذه اللعبة؟' : 'Did you enjoy this game?'}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setReaction(gameId, 'like')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentReaction === 'like'
                ? 'bg-brand-emerald text-white shadow-md'
                : 'bg-dark-800 text-slate-400 hover:text-white hover:bg-dark-750'
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${currentReaction === 'like' ? 'fill-white' : ''}`} />
            <span>{lang === 'ar' ? 'أعجبتني' : 'Yes'}</span>
          </button>

          <button
            onClick={() => setReaction(gameId, 'dislike')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentReaction === 'dislike'
                ? 'bg-brand-rose text-white shadow-md'
                : 'bg-dark-800 text-slate-400 hover:text-white hover:bg-dark-750'
            }`}
          >
            <ThumbsDown className={`w-3.5 h-3.5 ${currentReaction === 'dislike' ? 'fill-white' : ''}`} />
            <span>{lang === 'ar' ? 'لم تعجبني' : 'No'}</span>
          </button>
        </div>
      </div>

      {/* Quick Reaction Pills */}
      <div className="flex items-center flex-wrap gap-1.5">
        {REACTION_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag.id);
          const label = lang === 'ar' ? tag.labelAr : tag.label;

          return (
            <button
              key={tag.id}
              onClick={() => toggleReactionTag(gameId, tag.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                isSelected
                  ? 'bg-brand-purple/20 border-brand-purple text-brand-cyan shadow-sm'
                  : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-slate-200 hover:border-dark-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

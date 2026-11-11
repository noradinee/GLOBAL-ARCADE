import React from 'react';
import { useProfile } from '../../context/ProfileContext';
import { Award, Zap, Flame, Trophy, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useProfile();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Trophy;
        let colorClass = 'border-brand-purple text-brand-purple bg-brand-purple/10';

        if (toast.type === 'streak') {
          Icon = Flame;
          colorClass = 'border-brand-amber text-brand-amber bg-brand-amber/10';
        } else if (toast.type === 'level') {
          Icon = Zap;
          colorClass = 'border-brand-neon text-brand-neon bg-brand-cyan/10';
        } else if (toast.type === 'badge') {
          Icon = Award;
          colorClass = 'border-brand-rose text-brand-rose bg-brand-rose/10';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-dark-900/95 backdrop-blur-md border shadow-2xl shadow-black/80 animate-slideUp transition-all duration-300 ${colorClass}`}
          >
            <div className="p-2 rounded-xl bg-dark-850 shrink-0">
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-black text-white truncate">
                {toast.title}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">
                {toast.subtitle}
              </p>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { AdSlot } from './AdSlot';
import { X } from 'lucide-react';

interface InterstitialModalProps {
  isOpen: boolean;
  onClose: () => void;
  countdownSeconds?: number;
}

export const InterstitialModal: React.FC<InterstitialModalProps> = ({
  isOpen,
  onClose,
  countdownSeconds = 4,
}) => {
  const { t } = useLanguage();
  const [secondsRemaining, setSecondsRemaining] = useState(countdownSeconds);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(countdownSeconds);
      setCanSkip(false);
      return;
    }

    setSecondsRemaining(countdownSeconds);
    setCanSkip(false);

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, countdownSeconds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-dark-900 border border-dark-700 rounded-2xl p-6 shadow-2xl flex flex-col items-center">
        {/* Skip / Close Button */}
        <div className="w-full flex justify-between items-center mb-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t.ads.advertisement}
          </span>

          <button
            onClick={onClose}
            disabled={!canSkip}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              canSkip
                ? 'bg-brand-purple text-white hover:bg-brand-violet cursor-pointer'
                : 'bg-dark-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>{canSkip ? t.common.close : `Skip in ${secondsRemaining}s`}</span>
            {canSkip && <X className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Ad container */}
        <AdSlot placement="interstitial" />
      </div>
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import { AdSlotPlacement } from '../../types/ads';
import { adService } from '../../services/adService';
import { useLanguage } from '../../context/LanguageContext';
import { Megaphone } from 'lucide-react';

interface AdSlotProps {
  placement: AdSlotPlacement;
  className?: string;
  customClass?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ placement, className = '', customClass = '' }) => {
  const { t } = useLanguage();
  const adContainerRef = useRef<HTMLDivElement>(null);

  const slotConfig = adService.getSlotConfig(placement);
  const adsEnabled = adService.isAdsEnabled();
  const isDevMock = adService.isDevMockMode();
  const activeProvider = adService.getActiveProvider(placement);

  useEffect(() => {
    // If live provider is active and consent is given, this is the safe injection hook
    if (adsEnabled && !isDevMock && slotConfig) {
      // In production with live approved publisher account, inject provider tag here
    }
  }, [adsEnabled, isDevMock, slotConfig]);

  if (!adsEnabled || !slotConfig) return null;

  const [dWidth, dHeight] = slotConfig.desktopSize;
  const [mWidth, mHeight] = slotConfig.mobileSize;

  return (
    <div
      className={`my-6 flex flex-col items-center justify-center select-none ${className} ${customClass}`}
      data-ad-placement={placement}
      data-ad-provider={activeProvider}
    >
      {/* Required ad disclaimer badge to prevent accidental clicks */}
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
        <Megaphone className="w-3 h-3 text-slate-600" />
        <span>{t.ads.advertisement}</span>
      </div>

      {/* Responsive Slot Container */}
      <div
        ref={adContainerRef}
        style={{
          minWidth: `${mWidth}px`,
          minHeight: `${mHeight}px`,
        }}
        className="relative bg-dark-900/80 border border-dark-800 rounded-xl overflow-hidden flex flex-col items-center justify-center p-3 text-center transition-all shadow-inner"
      >
        {isDevMock ? (
          <div className="space-y-2 py-4 px-6 flex flex-col items-center justify-center max-w-sm">
            <div className="px-2.5 py-1 rounded-md bg-dark-800 text-[11px] font-mono text-brand-purple border border-dark-700">
              Slot: {placement} • {activeProvider}
            </div>
            <p className="text-xs text-slate-400">
              {t.ads.devNotice}
            </p>
            <div className="text-[10px] text-slate-500 font-mono">
              Desktop: {dWidth}x{dHeight} | Mobile: {mWidth}x{mHeight}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
            {/* Live ad container target */}
            <span>{t.ads.sponsored}</span>
          </div>
        )}
      </div>
    </div>
  );
};

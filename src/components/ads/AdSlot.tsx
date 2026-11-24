import React, { useEffect, useRef, useState } from 'react';
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
  const { t, lang } = useLanguage();
  const insRef = useRef<HTMLModElement>(null);
  const [isUnfilled, setIsUnfilled] = useState(false);

  const slotConfig = adService.getSlotConfig(placement);
  const adsEnabled = adService.isAdsEnabled();
  const activeProvider = adService.getActiveProvider(placement);
  const publisherId = adService.getPublisherId('adsense') || 'ca-pub-1216297804150458';
  const slotId = slotConfig?.slotId?.trim() || '';
  const isAdSense = activeProvider === 'adsense';

  // Only render manual AdSense <ins> units when a real AdSense slotId exists.
  // Before approval (or before manual units are created), Google Auto Ads in <head>
  // handles review and serving without showing empty "ADVERTISEMENT" placeholder boxes.
  const shouldRenderAd = adsEnabled && Boolean(slotConfig) && (!isAdSense || Boolean(slotId));

  useEffect(() => {
    if (!shouldRenderAd || !isAdSense) return;

    try {
      const win = window as unknown as { adsbygoogle?: Array<Record<string, unknown>> };
      win.adsbygoogle = win.adsbygoogle || [];
      win.adsbygoogle.push({});
    } catch {
      // Suppress errors when adblocker blocks script
    }

    const node = insRef.current;
    if (!node || typeof MutationObserver === 'undefined') return;

    const checkStatus = () => {
      if (node.getAttribute('data-ad-status') === 'unfilled') {
        setIsUnfilled(true);
      }
    };
    checkStatus();

    const observer = new MutationObserver(checkStatus);
    observer.observe(node, { attributes: true, attributeFilter: ['data-ad-status'] });
    return () => observer.disconnect();
  }, [shouldRenderAd, isAdSense, placement]);

  if (!shouldRenderAd || !slotConfig || isUnfilled) return null;

  const [dWidth, dHeight] = slotConfig.desktopSize;

  return (
    <div
      className={`my-4 sm:my-6 flex flex-col items-center justify-center select-none w-full ${className} ${customClass}`}
      data-ad-placement={placement}
      data-ad-provider={activeProvider}
    >
      <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
        <Megaphone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500" />
        <span>{t.ads.advertisement}</span>
      </div>

      <div
        style={{
          maxWidth: `${dWidth}px`,
          minHeight: `${Math.min(dHeight, 90)}px`,
        }}
        className="relative w-full bg-dark-900/40 border border-dark-800/80 rounded-xl overflow-hidden flex items-center justify-center p-2 text-center"
      >
        {isAdSense ? (
          <ins
            ref={insRef}
            className="adsbygoogle"
            style={{
              display: 'block',
              width: '100%',
              minHeight: `${Math.min(dHeight, 90)}px`,
              textAlign: 'center',
            }}
            data-ad-client={publisherId}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{lang === 'ar' ? 'مساحة إعلانية' : 'Sponsor Space'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

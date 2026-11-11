import React, { useState, useRef, useEffect } from 'react';
import { Game } from '../../types/game';
import { useLanguage } from '../../context/LanguageContext';
import { useProfile } from '../../context/ProfileContext';
import { analytics } from '../../services/analytics';
import {
  Maximize,
  Minimize,
  RotateCcw,
  Play,
  AlertTriangle,
  Loader2,
  Gamepad2,
  Share2,
  Check,
  Tv,
  Keyboard,
  Trophy,
} from 'lucide-react';

interface GamePlayerProps {
  game: Game;
}

export const GamePlayer: React.FC<GamePlayerProps> = ({ game }) => {
  const { t, lang, isRtl } = useLanguage();
  const { recordGameSession, profile } = useProfile();

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheatreMode, setIsTheatreMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [copiedChallenge, setCopiedChallenge] = useState(false);

  const title = lang === 'ar' ? game.titleAr : game.title;
  const personalBest = profile.highScores[game.id] || 0;

  // Handle Fullscreen state change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Listen for global keyboard shortcuts when playing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        if (!isFullscreen) setIsTheatreMode((prev) => !prev);
      }
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
      if (e.key === 'r' || e.key === 'R') {
        if (isPlaying) handleRestart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isFullscreen]);

  const handleStartPlay = () => {
    setIsPlaying(true);
    setIsLoading(true);
    setHasError(false);
    recordGameSession(game.id);
    analytics.trackGameStarted(game.id, game.title, game.sourceType);
  };

  const handleRestart = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      setHasError(false);
      iframeRef.current.src = game.gameSource;
    }
  };

  const toggleFullscreen = async () => {
    if (!playerContainerRef.current) return;

    try {
      if (!isFullscreen) {
        if (playerContainerRef.current.requestFullscreen) {
          await playerContainerRef.current.requestFullscreen();
        } else if ((playerContainerRef.current as any).webkitRequestFullscreen) {
          await (playerContainerRef.current as any).webkitRequestFullscreen();
        } else if ((playerContainerRef.current as any).msRequestFullscreen) {
          await (playerContainerRef.current as any).msRequestFullscreen();
        }
        analytics.trackFullscreenClicked(game.id, true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        analytics.trackFullscreenClicked(game.id, false);
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  const handleShareChallenge = () => {
    const shareUrl = window.location.href;
    const challengeText =
      lang === 'ar'
        ? `🎮 لقد حققت رقماً قياسياً في لعبة ${title} على منصة جلوبال أركيد! هل يمكنك التفوق عليّ؟ العب الآن: ${shareUrl}`
        : `⚡ I am challenging you in ${title} on Global Arcade! Can you beat my personal best? Play now: ${shareUrl}`;

    if (navigator.share) {
      navigator.share({
        title: `Challenge: ${title}`,
        text: challengeText,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(challengeText);
      setCopiedChallenge(true);
      setTimeout(() => setCopiedChallenge(false), 3000);
    }
  };

  return (
    <div className={`w-full flex flex-col items-center transition-all ${isTheatreMode ? 'relative z-30' : ''}`}>
      {/* Theatre Mode Backdrop Dimmer */}
      {isTheatreMode && !isFullscreen && (
        <div
          onClick={() => setIsTheatreMode(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-20 transition-opacity animate-fadeIn"
        />
      )}

      {/* Player Viewport */}
      <div
        ref={playerContainerRef}
        className={`relative w-full bg-dark-950 rounded-2xl overflow-hidden border border-dark-750 shadow-2xl transition-all duration-300 ${
          isFullscreen
            ? 'fixed inset-0 z-50 rounded-none border-none w-screen h-screen'
            : isTheatreMode
            ? 'relative z-30 max-w-6xl aspect-[16/9] shadow-glow-purple border-brand-purple/50'
            : 'aspect-[16/10] sm:aspect-[16/9] max-h-[640px]'
        }`}
      >
        {!isPlaying ? (
          /* Splash Overlay before playing */
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-t from-dark-950 via-dark-900/95 to-dark-950 p-6 text-center">
            {/* Background blurred game thumbnail */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-md"
              style={{ backgroundImage: `url(${game.thumbnail})` }}
            />

            <div className="relative z-10 flex flex-col items-center max-w-md">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-brand-violet to-brand-cyan p-1 shadow-glow-purple mb-4">
                <div className="w-full h-full bg-dark-900 rounded-[14px] flex items-center justify-center">
                  <Gamepad2 className="w-8 h-8 sm:w-10 sm:h-10 text-brand-cyan" />
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white mb-2">{title}</h2>
              <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 mb-4">
                {lang === 'ar' ? game.descriptionAr : game.description}
              </p>

              {personalBest > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark-800 text-brand-amber text-xs font-mono font-bold mb-4 border border-dark-700">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Your Record: {personalBest}</span>
                </div>
              )}

              <button
                onClick={handleStartPlay}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-brand-purple via-brand-violet to-brand-cyan text-white font-extrabold text-base sm:text-lg shadow-glow-cyan hover:scale-105 active:scale-95 transition-all"
              >
                <Play className={`w-5 h-5 fill-white ${isRtl ? 'rotate-180' : ''}`} />
                <span>{t.game.playNow}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Game Viewport */
          <>
            {isLoading && (
              <div className="absolute inset-0 z-10 bg-dark-950 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-brand-cyan animate-spin" />
                <span className="text-sm font-semibold text-slate-300">
                  {t.game.loadingGame}
                </span>
              </div>
            )}

            {hasError ? (
              <div className="absolute inset-0 z-20 bg-dark-950 flex flex-col items-center justify-center p-6 text-center gap-4">
                <div className="p-3 bg-brand-rose/20 text-brand-rose rounded-full">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <p className="text-sm text-slate-300 max-w-sm">{t.game.errorLoading}</p>
                <button
                  onClick={handleRestart}
                  className="px-5 py-2 rounded-xl bg-brand-purple text-white text-xs font-bold hover:bg-brand-violet transition-colors"
                >
                  {t.game.errorRetry}
                </button>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                src={game.gameSource}
                title={title}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen; keyboard; gamepad"
                sandbox="allow-scripts allow-same-origin allow-pointer-lock"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Control Bar below player */}
      <div className={`w-full mt-3 bg-dark-900 border border-dark-800 rounded-xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-300 ${isTheatreMode ? 'relative z-30 max-w-6xl' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm truncate max-w-[180px] sm:max-w-xs">
            {title}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-brand-violet/20 text-brand-cyan font-semibold text-[10px] border border-brand-violet/30 uppercase">
            {game.category}
          </span>
          {personalBest > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-brand-amber font-bold">
              <Trophy className="w-3 h-3" />
              <span>{personalBest}</span>
            </span>
          )}
        </div>

        {/* Player Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Theatre Mode Toggle */}
          <button
            onClick={() => setIsTheatreMode(!isTheatreMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              isTheatreMode
                ? 'bg-brand-purple text-white shadow-sm'
                : 'bg-dark-800 hover:bg-dark-750 text-slate-300'
            }`}
            title="Theatre Mode (T)"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isTheatreMode ? 'Standard' : 'Theatre'}</span>
          </button>

          {/* Restart */}
          {isPlaying && (
            <button
              onClick={handleRestart}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-200 transition-colors"
              title="Restart Game (R)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.game.restart}</span>
            </button>
          )}

          {/* Share Score / Challenge */}
          <button
            onClick={handleShareChallenge}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-200 transition-colors"
            title="Challenge Friends"
          >
            {copiedChallenge ? (
              <>
                <Check className="w-3.5 h-3.5 text-brand-emerald" />
                <span className="text-brand-emerald font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Challenge</span>
              </>
            )}
          </button>

          {/* Keyboard Shortcuts Helper */}
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white transition-colors"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-purple to-brand-cyan text-white font-bold hover:opacity-95 shadow-sm transition-all"
            title={isFullscreen ? t.game.exitFullscreen : `${t.game.fullscreen} (F)`}
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.game.exitFullscreen}</span>
              </>
            ) : (
              <>
                <Maximize className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.game.fullscreen}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-dark-900 border border-dark-700 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-dark-800 pb-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-brand-cyan" />
                Keyboard Shortcuts
              </h4>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Toggle Fullscreen</span>
                <kbd className="px-2 py-0.5 rounded bg-dark-800 border border-dark-700 text-white font-mono">F</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Toggle Theatre Mode</span>
                <kbd className="px-2 py-0.5 rounded bg-dark-800 border border-dark-700 text-white font-mono">T</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Restart Current Game</span>
                <kbd className="px-2 py-0.5 rounded bg-dark-800 border border-dark-700 text-white font-mono">R</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { useEffect, useCallback } from 'react';

// Shared counter across concurrent modals to ensure nested/stacked modals safely manage document body overflow
let activeModalCount = 0;
let originalOverflowStyle = '';

export interface UseModalDismissOptions {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  lockBodyScroll?: boolean;
}

/**
 * Universal Modal Dismiss Hook for KYRAXO
 *
 * Provides:
 * - Robust Escape key listener with instant dismissal
 * - Clean backdrop click detection (ignoring child content clicks)
 * - Safe body scroll lock with reference counting for nested modals
 * - Complete teardown and scroll restoration on unmount or route change
 */
export function useModalDismiss({
  isOpen,
  onClose,
  closeOnEscape = true,
  closeOnBackdrop = true,
  lockBodyScroll = true,
}: UseModalDismissOptions) {
  // 1. Keyboard event listener (Escape)
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen, closeOnEscape, onClose]);

  // 2. Body scroll locking with reference counting
  useEffect(() => {
    if (!isOpen || !lockBodyScroll) return;

    if (activeModalCount === 0) {
      originalOverflowStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeModalCount++;

    return () => {
      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        document.body.style.overflow = originalOverflowStyle || '';
      }
    };
  }, [isOpen, lockBodyScroll]);

  // 3. Backdrop click handler
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!closeOnBackdrop) return;
      if (e.target === e.currentTarget) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [closeOnBackdrop, onClose]
  );

  return {
    handleBackdropClick,
  };
}

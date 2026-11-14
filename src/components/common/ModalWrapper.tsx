import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalDismiss, UseModalDismissOptions } from '../../hooks/useModalDismiss';

export interface ModalWrapperProps extends UseModalDismissOptions {
  children: React.ReactNode;
  backdropClassName?: string;
  containerClassName?: string;
  role?: string;
  'aria-modal'?: boolean;
  'aria-label'?: string;
}

/**
 * Universal Modal Wrapper Component
 *
 * Encapsulates:
 * - Mounts via createPortal directly into document.body to bypass parent CSS transform/backdrop-filter containing blocks
 * - Escape key dismissal
 * - Full-viewport backdrop click dismissal
 * - Global body scroll locking & restoration
 * - ARIA accessibility attributes
 */
export const ModalWrapper: React.FC<ModalWrapperProps> = ({
  isOpen,
  onClose,
  closeOnEscape = true,
  closeOnBackdrop = true,
  lockBodyScroll = true,
  children,
  backdropClassName = 'bg-black/85 backdrop-blur-md',
  containerClassName = 'w-full flex items-center justify-center',
  role = 'dialog',
  'aria-modal': ariaModal = true,
  'aria-label': ariaLabel,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { handleBackdropClick } = useModalDismiss({
    isOpen,
    onClose,
    closeOnEscape,
    closeOnBackdrop,
    lockBodyScroll,
  });

  if (!isOpen || !mounted) return null;

  const content = (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn ${backdropClassName}`}
      onClick={handleBackdropClick}
      role={role}
      aria-modal={ariaModal}
      aria-label={ariaLabel}
    >
      <div
        className={containerClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

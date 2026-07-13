import { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '40px',
        animation: 'fadeInUp 0.2s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--fill-primary)',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '270px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ padding: '20px 16px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {title}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>
            {message}
          </p>
        </div>
        <div style={{ borderTop: '0.5px solid var(--separator)' }}>
          <button
            onClick={onCancel}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '17px',
              color: 'var(--blue)',
              fontWeight: 400,
            }}
          >
            {cancelLabel}
          </button>
        </div>
        <div style={{ borderTop: '0.5px solid var(--separator)' }}>
          <button
            onClick={onConfirm}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '17px',
              color: destructive ? '#FF3B30' : 'var(--blue)',
              fontWeight: 600,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

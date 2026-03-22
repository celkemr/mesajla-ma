'use client';
import { useState, useCallback } from 'react';

type DialogConfig = {
  message: string;
  type: 'confirm' | 'alert';
  variant: 'danger' | 'info' | 'success';
  confirmLabel?: string;
  resolve: (val: boolean) => void;
};

const ICONS = {
  danger: (
    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.12)' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" className="w-6 h-6">
        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
      </svg>
    </div>
  ),
  info: (
    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(99,102,241,0.12)' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#6366f1" className="w-6 h-6">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5A.75.75 0 0 0 12 9Z" clipRule="evenodd" />
      </svg>
    </div>
  ),
  success: (
    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(34,197,94,0.12)' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#22c55e" className="w-6 h-6">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
      </svg>
    </div>
  ),
};

function detectVariant(message: string): 'danger' | 'info' | 'success' {
  if (message.startsWith('✅') || message.startsWith('Chat ID bulundu')) return 'success';
  if (message.startsWith('❌')) return 'danger';
  return 'info';
}

function DialogModal({ config, onClose }: { config: DialogConfig; onClose: (v: boolean) => void }) {
  const variant = config.variant;
  const confirmBtnStyle =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : 'text-white';

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onClose(false)}
      />
      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#fff' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div
          className="h-1 w-full"
          style={{
            background:
              variant === 'danger'
                ? 'linear-gradient(90deg, #ef4444, #f97316)'
                : variant === 'success'
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
          }}
        />

        <div className="p-6 text-center">
          {ICONS[variant]}

          <p className="text-slate-800 text-sm font-medium leading-relaxed whitespace-pre-line">
            {/* Strip leading emoji since we use SVG icons */}
            {config.message.replace(/^[✅❌]\s?/, '')}
          </p>

          {config.type === 'confirm' && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => onClose(false)}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => onClose(true)}
                className={`flex-1 text-sm font-medium py-2.5 rounded-xl transition-colors ${
                  variant === 'danger'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'text-white'
                }`}
                style={
                  variant !== 'danger'
                    ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }
                    : {}
                }
              >
                {config.confirmLabel ?? 'Evet, Sil'}
              </button>
            </div>
          )}

          {config.type === 'alert' && (
            <button
              onClick={() => onClose(true)}
              className="mt-6 w-full text-sm font-medium py-2.5 rounded-xl text-white transition-colors"
              style={
                variant === 'danger'
                  ? { background: 'linear-gradient(135deg, #ef4444, #f97316)' }
                  : variant === 'success'
                  ? { background: 'linear-gradient(135deg, #22c55e, #16a34a)' }
                  : { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }
              }
            >
              Tamam
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function useDialog() {
  const [config, setConfig] = useState<DialogConfig | null>(null);

  const confirm = useCallback((message: string, options?: { variant?: 'danger' | 'info'; confirmLabel?: string }): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig({ message, type: 'confirm', variant: options?.variant ?? 'danger', confirmLabel: options?.confirmLabel, resolve });
    });
  }, []);

  const showAlert = useCallback((message: string): Promise<void> => {
    return new Promise((resolve) => {
      const variant = detectVariant(message);
      setConfig({ message, type: 'alert', variant, resolve: () => resolve() });
    });
  }, []);

  function handleClose(val: boolean) {
    config?.resolve(val);
    setConfig(null);
  }

  const dialog = config ? <DialogModal config={config} onClose={handleClose} /> : null;

  return { confirm, showAlert, dialog };
}

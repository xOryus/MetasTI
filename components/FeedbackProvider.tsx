import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  durationMs?: number;
}

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface FeedbackContextValue {
  toastSuccess: (message: string, title?: string, durationMs?: number) => void;
  toastError: (message: string, title?: string, durationMs?: number) => void;
  toastInfo: (message: string, title?: string, durationMs?: number) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export const useFeedback = (): FeedbackContextValue => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    // Fallback seguro caso Provider não esteja montado
    return {
      toastSuccess: (message: string) => typeof window !== 'undefined' && window.alert(message),
      toastError: (message: string) => typeof window !== 'undefined' && window.alert(message),
      toastInfo: (message: string) => typeof window !== 'undefined' && window.alert(message),
      confirm: async (options: ConfirmOptions) => {
        if (typeof window === 'undefined') return false;
        return window.confirm(options?.description || 'Confirmar ação?');
      },
    };
  }
  return ctx;
};

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolverRef = useRef<(value: boolean) => void>();

  const enqueue = useCallback((type: ToastType, message: string, title?: string, durationMs: number = 3500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item: ToastItem = { id, type, message, title, durationMs };
    setToasts(prev => [...prev, item].slice(-4)); // limita a 4 simultâneos
    // auto-dismiss
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, durationMs);
  }, []);

  const toastSuccess = useCallback((message: string, title?: string, durationMs?: number) => enqueue('success', message, title, durationMs), [enqueue]);
  const toastError = useCallback((message: string, title?: string, durationMs?: number) => enqueue('error', message, title, durationMs), [enqueue]);
  const toastInfo = useCallback((message: string, title?: string, durationMs?: number) => enqueue('info', message, title, durationMs), [enqueue]);

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmState({ ...options, open: true });
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const onConfirm = useCallback(() => {
    setConfirmState(prev => (prev ? { ...prev, open: false } : prev));
    const resolver = resolverRef.current; resolverRef.current = undefined;
    resolver?.(true);
  }, []);

  const onCancel = useCallback(() => {
    setConfirmState(prev => (prev ? { ...prev, open: false } : prev));
    const resolver = resolverRef.current; resolverRef.current = undefined;
    resolver?.(false);
  }, []);

  const value = useMemo<FeedbackContextValue>(() => ({ toastSuccess, toastError, toastInfo, confirm }), [toastSuccess, toastError, toastInfo, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {/* Toasts */}
      <div style={{ position: 'fixed', right: 16, bottom: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 50 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ minWidth: 280 }} className={`shadow-lg rounded-md px-4 py-3 text-sm bg-white border ${
            t.type === 'success' ? 'border-green-200' : t.type === 'error' ? 'border-red-200' : 'border-blue-200'
          }`}>
            {t.title && <div className={`font-semibold mb-1 ${t.type === 'success' ? 'text-green-700' : t.type === 'error' ? 'text-red-700' : 'text-blue-700'}`}>{t.title}</div>}
            <div className="text-gray-700">{t.message}</div>
          </div>
        ))}
      </div>

      {/* Confirm Dialog (leve, sem dependências) */}
      {confirmState?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-5 py-4 border-b">
              <div className="text-base font-semibold text-gray-900">{confirmState.title || 'Confirmar ação'}</div>
              {confirmState.description && (
                <div className="text-sm text-gray-600 mt-1">{confirmState.description}</div>
              )}
            </div>
            <div className="px-5 py-4 flex justify-end gap-2">
              <button className="px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={onCancel}>
                {confirmState.cancelText || 'Cancelar'}
              </button>
              <button className={`px-3 py-2 text-sm rounded-md text-white ${confirmState.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`} onClick={onConfirm}>
                {confirmState.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};



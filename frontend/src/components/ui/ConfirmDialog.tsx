import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm 必须在 ConfirmProvider 内使用');
  return confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ ...options, resolve });
    });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !request) return;
    try {
      dialog.showModal();
    } catch {
      dialog.setAttribute('open', '');
    }
  }, [request]);

  const settle = (value: boolean) => {
    request?.resolve(value);
    dialogRef.current?.close?.();
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <dialog
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="m-auto w-[min(92vw,24rem)] rounded-2xl border border-rule bg-card p-0 text-ink shadow-xl backdrop:bg-ink/40"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              settle(false);
            }
          }}
          onCancel={(event) => {
            event.preventDefault();
            settle(false);
          }}
        >
          <form
            className="p-6"
            onSubmit={(event) => {
              event.preventDefault();
              settle(true);
            }}
          >
            <h2 id="confirm-title" className="font-serif text-xl text-ink">
              {request.title ?? '请确认'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{request.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => settle(false)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:bg-rule/70"
              >
                取消
              </button>
              <button
                type="submit"
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  request.danger ? 'bg-danger text-paper' : 'bg-accent text-accent-ink'
                }`}
              >
                {request.confirmLabel ?? '确定'}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </ConfirmContext.Provider>
  );
}

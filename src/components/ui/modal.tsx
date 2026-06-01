"use client";
export function Modal({
  open, onClose, title, children, footer, wide,
}: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/30 p-4 py-10" onClick={onClose}>
      <div className={`card w-full ${wide ? "max-w-3xl" : "max-w-lg"} p-0`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-surface-line px-5 py-3">
          <h3 className="text-base font-medium text-ink">{title}</h3>
          <button onClick={onClose} className="text-ink-soft hover:text-ink">✕</button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-surface-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

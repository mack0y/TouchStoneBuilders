import { useEffect, useRef } from 'react'

export default function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
  const ref = useRef(null)
  const confirmBtnRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const onConfirmRef = useRef(onConfirm)
  onCloseRef.current = onClose
  onConfirmRef.current = onConfirm

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open) {
      el.showModal()
      requestAnimationFrame(() => confirmBtnRef.current?.focus())
    } else {
      el.close()
    }
  }, [open])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    function handleClose() { onCloseRef.current() }
    el.addEventListener('close', handleClose)
    return () => el.removeEventListener('close', handleClose)
  }, [])

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-modal="true"
      aria-labelledby={title ? 'confirm-modal-title' : undefined}
    >
      <div className="modal-box shadow-2xl border border-base-200/50 animate-scale-in">
        {title && (
          <div className="flex items-center gap-3 mb-2">
            {danger && (
              <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-error"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
              </div>
            )}
            <h3 id="confirm-modal-title" className="font-bold text-lg">{title}</h3>
          </div>
        )}
        {message && <p className="py-3 text-sm text-base-content/60">{message}</p>}
        <div className="modal-action">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{cancelLabel}</button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`btn btn-sm shadow-sm ${danger ? 'btn-error' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  )
}

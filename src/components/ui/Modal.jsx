import { useEffect, useRef } from 'react'

function getFocusableElements(container) {
  return container.querySelectorAll(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
  )
}

export default function Modal({ open, onClose, title, children }) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  const dialogId = useRef(`modal-${Math.random().toString(36).slice(2, 9)}`)
  onCloseRef.current = onClose

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open) el.showModal()
    else el.close()
  }, [open])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    function handleClose() { onCloseRef.current() }
    el.addEventListener('close', handleClose)
    return () => el.removeEventListener('close', handleClose)
  }, [])

  useEffect(() => {
    if (!open) return
    const el = ref.current
    if (!el) return

    function handleKeyDown(e) {
      if (e.key !== 'Tab') return
      const focusable = getFocusableElements(el)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <dialog
      id={dialogId.current}
      ref={ref}
      className="modal"
      aria-labelledby={title ? `${dialogId.current}-title` : undefined}
      aria-modal="true"
    >
      <div className="modal-box max-w-lg border border-slate-200 shadow-lg p-6 animate-scale-in bg-white">
        <button type="button" className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 text-slate-400 hover:text-slate-600" onClick={onClose} aria-label="Close">✕</button>
        {title && <h3 id={`${dialogId.current}-title`} className="font-bold text-lg text-slate-800 mb-4">{title}</h3>}
        {children}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  )
}

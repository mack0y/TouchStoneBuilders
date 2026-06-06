import { useEffect, useRef } from 'react'

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

  return (
    <dialog
      id={dialogId.current}
      ref={ref}
      className="modal"
      aria-labelledby={title ? `${dialogId.current}-title` : undefined}
      aria-modal="true"
    >
      <div className="modal-box max-w-lg">
        <button type="button" className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>✕</button>
        {title && <h3 id={`${dialogId.current}-title`} className="font-bold text-lg mb-4">{title}</h3>}
        {children}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  )
}

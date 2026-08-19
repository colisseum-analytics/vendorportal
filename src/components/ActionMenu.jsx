import { useEffect, useRef, useState } from 'react'

// items: [{ label, onClick, disabled, danger }]
export default function ActionMenu({ items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div className="action-menu" ref={ref}>
      <button type="button" className="action-menu-trigger" onClick={() => setOpen((o) => !o)} aria-label="More actions" aria-expanded={open}>
        ⋯
      </button>
      {open ? (
        <div className="action-menu-list">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              className={`action-menu-item ${item.danger ? 'action-menu-item-danger' : ''}`}
              disabled={item.disabled}
              onClick={() => { setOpen(false); item.onClick() }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

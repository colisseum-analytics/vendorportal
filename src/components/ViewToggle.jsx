export default function ViewToggle({ view, onChange }) {
  return (
    <div className="view-toggle" role="group" aria-label="Layout">
      <button
        type="button"
        className={view === 'grid' ? 'active' : ''}
        onClick={() => onChange('grid')}
        title="Grid view"
        aria-label="Grid view"
      >
        ▦
      </button>
      <button
        type="button"
        className={view === 'list' ? 'active' : ''}
        onClick={() => onChange('list')}
        title="List view"
        aria-label="List view"
      >
        ☰
      </button>
    </div>
  )
}

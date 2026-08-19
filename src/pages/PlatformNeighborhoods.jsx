import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { relativeTime } from '../utils/relativeTime'
import CityPicker from '../components/CityPicker.jsx'
import ActionMenu from '../components/ActionMenu.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'

export default function PlatformNeighborhoods() {
  usePageMeta({ title: 'Platform admin · Neighborhoods', noindex: true })
  const { neighborhoods, vendorCounts, lastVendorAdded, adminCounts, reloadCore } = useOutletContext()

  const [renaming, setRenaming] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameCityValue, setRenameCityValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [collapsedCities, setCollapsedCities] = useState(() => new Set())

  const toggleCity = (city) => {
    setCollapsedCities((set) => {
      const next = new Set(set)
      if (next.has(city)) next.delete(city)
      else next.add(city)
      return next
    })
  }

  const toggleActive = async (n) => {
    setBusyId(n.id)
    await supabase.from('neighborhoods').update({ active: !n.active }).eq('id', n.id)
    await reloadCore()
    setBusyId(null)
  }

  const startRename = (n) => { setRenaming(n); setRenameValue(n.name); setRenameCityValue(n.city || '') }

  const saveRename = async (e) => {
    e.preventDefault()
    if (!renameValue.trim()) return
    setBusyId(renaming.id)
    await supabase.from('neighborhoods').update({ name: renameValue.trim(), city: renameCityValue.trim() || null }).eq('id', renaming.id)
    setRenaming(null)
    await reloadCore()
    setBusyId(null)
  }

  const confirmDelete = async () => {
    setBusyId(deleteTarget.id)
    await supabase.from('neighborhoods').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    await reloadCore()
    setBusyId(null)
  }

  const neighborhoodsByCity = (() => {
    const groups = {}
    neighborhoods.forEach((n) => {
      const city = n.city || 'No city set'
      if (!groups[city]) groups[city] = []
      groups[city].push(n)
    })
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'No city set') return 1
      if (b === 'No city set') return -1
      return a.localeCompare(b)
    })
  })()

  return (
    <div className="overview-card">
      <h2 className="section-title">Neighborhoods by city</h2>
      {neighborhoods.length === 0 ? (
        <div className="empty"><strong>No neighborhoods yet</strong></div>
      ) : (
        neighborhoodsByCity.map(([city, group]) => {
          const expanded = !collapsedCities.has(city)
          return (
          <div key={city} className="overview-subgroup">
            <button type="button" className="changelog-group-toggle" onClick={() => toggleCity(city)}>
              <span className={`changelog-group-chevron ${expanded ? 'changelog-group-chevron-open' : ''}`}>▸</span>
              <h3 className="overview-subgroup-title" style={{ margin: 0 }}>{city} <span className="badge badge-neutral">{group.length}</span></h3>
            </button>
            {expanded ? (
            <div className="user-list" style={{ marginTop: 8 }}>
              {group.map((n) => (
                <div className="user-row" key={n.id}>
                  <div className="user-row-main">
                    <strong>
                      <Link to={`/n/${n.slug}`} className="platform-name">{n.name}</Link>
                    </strong>
                    <span className="user-row-meta">
                      /n/{n.slug} · Created {relativeTime(n.created_at)}
                      {n.updated_at && n.updated_at !== n.created_at ? ` · Updated ${relativeTime(n.updated_at)}` : ''}
                      {lastVendorAdded[n.id] ? ` · Last vendor added ${relativeTime(lastVendorAdded[n.id])}` : ''}
                    </span>
                  </div>
                  <div className="user-row-roles">
                    <span className={`badge ${n.active ? 'badge-active' : 'badge-inactive'}`}>{n.active ? 'Active' : 'Inactive'}</span>
                    <span className="badge badge-neutral">{vendorCounts[n.id] || 0} vendor{(vendorCounts[n.id] || 0) === 1 ? '' : 's'}</span>
                    <span className="badge badge-neutral">{(n.categories || []).length} categor{(n.categories || []).length === 1 ? 'y' : 'ies'}</span>
                    <span className="badge badge-neutral">{adminCounts[n.id] || 0} admin{(adminCounts[n.id] || 0) === 1 ? '' : 's'}</span>
                  </div>
                  <div className="user-row-actions">
                    <ActionMenu
                      items={[
                        { label: 'Edit', onClick: () => startRename(n), disabled: busyId === n.id },
                        { label: n.active ? 'Deactivate' : 'Activate', onClick: () => toggleActive(n), disabled: busyId === n.id },
                        { label: 'Delete', onClick: () => setDeleteTarget(n), disabled: busyId === n.id, danger: true },
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
            ) : null}
          </div>
          )
        })
      )}

      {renaming ? (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setRenaming(null) }}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <button className="close-x" onClick={() => setRenaming(null)}>×</button>
            <h2>Edit neighborhood</h2>
            <form onSubmit={saveRename}>
              <div className="field">
                <label>Name</label>
                <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
              </div>
              <div className="field">
                <label>City</label>
                <CityPicker value={renameCityValue} onChange={setRenameCityValue} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setRenaming(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null) }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <button className="close-x" onClick={() => setDeleteTarget(null)}>×</button>
            <h2>Delete {deleteTarget.name}?</h2>
            <p className="sub">This permanently removes the neighborhood, its vendors, admins, and pending invites. This can't be undone.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-primary" style={{ background: 'var(--red)' }} onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

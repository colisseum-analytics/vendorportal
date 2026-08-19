import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { relativeTime } from '../utils/relativeTime'
import { usePageMeta } from '../hooks/usePageMeta.js'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function majorVersion(version) {
  const n = parseInt(version, 10)
  return Number.isFinite(n) ? n : null
}

// Entries are already sorted newest-first, so same-day runs are always
// contiguous — this just clusters adjacent entries sharing a formatted
// date into one card instead of a full-height card per push, which is
// what actually made a busy day's history unreadable.
function clusterByDay(entries) {
  const clusters = []
  for (const c of entries) {
    const day = formatDate(c.created_at)
    const last = clusters[clusters.length - 1]
    if (last && last.day === day) last.entries.push(c)
    else clusters.push({ day, entries: [c] })
  }
  return clusters
}

export default function PlatformHistory() {
  usePageMeta({ title: 'Platform admin · History', noindex: true })
  const { user } = useAuth()

  const [changelog, setChangelog] = useState([])
  const [changelogVersion, setChangelogVersion] = useState('')
  const [changelogSummary, setChangelogSummary] = useState('')
  const [changelogError, setChangelogError] = useState('')
  const [changelogSaving, setChangelogSaving] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState(null)

  const load = async () => {
    const { data } = await supabase.from('app_changelog').select('*').order('created_at', { ascending: false })
    setChangelog(data || [])
  }

  useEffect(() => { load() }, [])

  const addChangelogEntry = async (e) => {
    e.preventDefault()
    setChangelogError('')
    if (!changelogVersion.trim() || !changelogSummary.trim()) return
    setChangelogSaving(true)
    const { error } = await supabase.from('app_changelog').insert({
      version: changelogVersion.trim(),
      summary: changelogSummary.trim(),
      created_by: user.id,
    })
    setChangelogSaving(false)
    if (error) {
      setChangelogError(error.message)
      return
    }
    setChangelogVersion('')
    setChangelogSummary('')
    await load()
  }

  const deleteChangelogEntry = async (id) => {
    await supabase.from('app_changelog').delete().eq('id', id)
    setChangelog((list) => list.filter((c) => c.id !== id))
  }

  const groups = (() => {
    const byMajor = {}
    changelog.forEach((c) => {
      const major = majorVersion(c.version)
      const key = major === null ? 'Other' : `v${major}.x`
      if (!byMajor[key]) byMajor[key] = { major, entries: [] }
      byMajor[key].entries.push(c)
    })
    return Object.entries(byMajor).sort(([, a], [, b]) => {
      if (a.major === null) return 1
      if (b.major === null) return -1
      return b.major - a.major
    })
  })()

  useEffect(() => {
    if (expandedGroups === null && groups.length > 0) {
      setExpandedGroups(new Set([groups[0][0]]))
    }
  }, [groups, expandedGroups])

  const toggleGroup = (label) => {
    setExpandedGroups((set) => {
      const next = new Set(set || [])
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <div className="overview-card">
      <h2 className="section-title">Version history</h2>
      <p className="sub">Track what shipped and when, for your own reference.</p>
      <form className="invite-row" onSubmit={addChangelogEntry} style={{ flexWrap: 'wrap' }}>
        <input type="text" placeholder="Version (e.g. 1.4.0)" value={changelogVersion} onChange={(e) => setChangelogVersion(e.target.value)} style={{ maxWidth: 140 }} />
        <input type="text" placeholder="What changed…" value={changelogSummary} onChange={(e) => setChangelogSummary(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
        <button type="submit" className="btn-secondary" disabled={changelogSaving}>{changelogSaving ? 'Adding…' : 'Add entry'}</button>
      </form>
      {changelogError ? <div className="error-msg">{changelogError}</div> : null}
      {changelog.length === 0 ? (
        <p className="sub" style={{ marginTop: 12 }}>No entries yet.</p>
      ) : (
        groups.map(([label, group]) => {
          const expanded = expandedGroups?.has(label)
          return (
            <div key={label} className="overview-subgroup" style={{ marginTop: 18 }}>
              <button type="button" className="changelog-group-toggle" onClick={() => toggleGroup(label)}>
                <span className={`changelog-group-chevron ${expanded ? 'changelog-group-chevron-open' : ''}`}>▸</span>
                <h3 className="overview-subgroup-title" style={{ margin: 0 }}>
                  {label} <span className="badge badge-neutral">{group.entries.length}</span>
                </h3>
              </button>
              {expanded ? (
                <div className="message-list" style={{ marginTop: 8 }}>
                  {clusterByDay(group.entries).map((cluster) => (
                    <div key={cluster.day + cluster.entries[0].id} className="message-item">
                      <div className="message-item-head">
                        <span className="message-from">{cluster.day}</span>
                        <span className="message-time">{relativeTime(cluster.entries[0].created_at)}</span>
                      </div>
                      <ul className="changelog-cluster-list">
                        {cluster.entries.map((c) => (
                          <li key={c.id}>
                            <span className="changelog-version-tag">v{c.version}</span>
                            <span className="changelog-summary-text">{c.summary}</span>
                            <button
                              type="button"
                              className="changelog-delete-btn"
                              onClick={() => deleteChangelogEntry(c.id)}
                              aria-label={`Delete v${c.version} entry`}
                              title="Delete entry"
                            >×</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })
      )}
    </div>
  )
}

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

export default function PlatformHistory() {
  usePageMeta({ title: 'Platform admin · History', noindex: true })
  const { user } = useAuth()

  const [changelog, setChangelog] = useState([])
  const [changelogVersion, setChangelogVersion] = useState('')
  const [changelogSummary, setChangelogSummary] = useState('')
  const [changelogError, setChangelogError] = useState('')
  const [changelogSaving, setChangelogSaving] = useState(false)

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
        groups.map(([label, group]) => (
          <div key={label} className="overview-subgroup" style={{ marginTop: 18 }}>
            <h3 className="overview-subgroup-title">{label} <span className="badge badge-neutral">{group.entries.length}</span></h3>
            <div className="message-list">
              {group.entries.map((c) => (
                <div key={c.id} className="message-item">
                  <div className="message-item-head">
                    <span className="message-from">v{c.version}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="message-time">{formatDate(c.created_at)} · {relativeTime(c.created_at)}</span>
                      <button className="btn-ghost danger" onClick={() => deleteChangelogEntry(c.id)}>Delete</button>
                    </div>
                  </div>
                  <p className="message-text">{c.summary}</p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

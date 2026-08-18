import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { relativeTime } from '../utils/relativeTime'
import { usePageMeta } from '../hooks/usePageMeta.js'

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
        <div className="message-list" style={{ marginTop: 12 }}>
          {changelog.map((c) => (
            <div key={c.id} className="message-item">
              <div className="message-item-head">
                <span className="message-from">v{c.version}</span>
                <span className="message-time">{relativeTime(c.created_at)}</span>
              </div>
              <p className="message-text">{c.summary}</p>
              <div className="message-actions">
                <button className="btn-ghost danger" onClick={() => deleteChangelogEntry(c.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

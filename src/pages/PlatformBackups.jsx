import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { relativeTime } from '../utils/relativeTime'
import { usePageMeta } from '../hooks/usePageMeta.js'

const FREQUENCIES = [
  { value: 'manual', label: 'Manual only' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function monthLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
}

// Entries are already sorted newest-first, so same-month and same-day
// runs are always contiguous — this just clusters adjacent entries
// instead of giving every single backup its own full-height card, which
// is what actually made a long history unreadable (same fix as the
// Version history page).
function groupByMonth(entries) {
  const groups = []
  for (const b of entries) {
    const label = monthLabel(b.created_at)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.entries.push(b)
    else groups.push({ label, entries: [b] })
  }
  return groups
}

function clusterByDay(entries) {
  const clusters = []
  for (const b of entries) {
    const day = formatDate(b.created_at)
    const last = clusters[clusters.length - 1]
    if (last && last.day === day) last.entries.push(b)
    else clusters.push({ day, entries: [b] })
  }
  return clusters
}

export default function PlatformBackups() {
  usePageMeta({ title: 'Platform admin · Backups', noindex: true })

  const [backupLog, setBackupLog] = useState([])
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const [frequency, setFrequency] = useState('manual')
  const [savedFrequency, setSavedFrequency] = useState('manual')
  const [frequencySaving, setFrequencySaving] = useState(false)
  const [frequencyError, setFrequencyError] = useState('')
  const [frequencyMsg, setFrequencyMsg] = useState('')
  const [expandedGroups, setExpandedGroups] = useState(null)

  const load = async () => {
    const [{ data: logs }, { data: schedule }] = await Promise.all([
      supabase.from('backup_log').select('*').order('created_at', { ascending: false }),
      supabase.from('backup_schedule').select('*').eq('id', true).maybeSingle(),
    ])
    setBackupLog(logs || [])
    if (schedule) {
      setFrequency(schedule.frequency)
      setSavedFrequency(schedule.frequency)
    }
  }

  useEffect(() => { load() }, [])

  const groups = groupByMonth(backupLog)

  useEffect(() => {
    if (expandedGroups === null && groups.length > 0) {
      setExpandedGroups(new Set([groups[0].label]))
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

  const exportBackup = async () => {
    setExporting(true)
    setExportError('')
    const { data, error } = await supabase.rpc('export_platform_backup')
    setExporting(false)
    if (error) {
      setExportError(error.message)
      return
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `looplisting-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    await load()
  }

  const saveFrequency = async () => {
    setFrequencySaving(true)
    setFrequencyError('')
    setFrequencyMsg('')
    const { error } = await supabase.rpc('set_backup_frequency', { p_frequency: frequency })
    setFrequencySaving(false)
    if (error) {
      setFrequencyError(error.message)
      return
    }
    setSavedFrequency(frequency)
    setFrequencyMsg('Schedule updated.')
  }

  const deleteBackupEntry = async (id) => {
    setBusyId(id)
    await supabase.from('backup_log').delete().eq('id', id)
    setBusyId(null)
    setBackupLog((list) => list.filter((b) => b.id !== id))
  }

  return (
    <div className="overview-card">
      <h2 className="section-title">Disaster recovery backup</h2>
      <p className="sub">Exports every table on the platform as one JSON file you can store off-site.</p>
      {exportError ? <div className="error-msg">{exportError}</div> : null}
      <button type="button" className="btn-primary" disabled={exporting} onClick={exportBackup}>
        {exporting ? 'Exporting…' : 'Export full backup (JSON)'}
      </button>

      <div className="field-row" style={{ marginTop: 20, alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 'none', marginBottom: 0 }}>
          <label>Automatic backup frequency</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <button type="button" className="btn-secondary" disabled={frequencySaving || frequency === savedFrequency} onClick={saveFrequency}>
          {frequencySaving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {frequencyError ? <div className="error-msg">{frequencyError}</div> : null}
      {frequencyMsg ? <div className="success-msg">{frequencyMsg}</div> : null}
      <p className="hint">Runs alongside the manual export button and the automatic backup on every code push.</p>

      {groups.length > 0 ? (
        groups.map((group) => {
          const expanded = expandedGroups?.has(group.label)
          return (
            <div key={group.label} className="overview-subgroup" style={{ marginTop: 18 }}>
              <button type="button" className="changelog-group-toggle" onClick={() => toggleGroup(group.label)}>
                <span className={`changelog-group-chevron ${expanded ? 'changelog-group-chevron-open' : ''}`}>▸</span>
                <h3 className="overview-subgroup-title" style={{ margin: 0 }}>
                  {group.label} <span className="badge badge-neutral">{group.entries.length}</span>
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
                        {cluster.entries.map((b) => (
                          <li key={b.id}>
                            <span className="changelog-summary-text">
                              {Object.entries(b.row_counts || {}).map(([k, v]) => `${v} ${k}`).join(' · ')}
                            </span>
                            <button
                              type="button"
                              className="changelog-delete-btn"
                              disabled={busyId === b.id}
                              onClick={() => deleteBackupEntry(b.id)}
                              aria-label="Delete backup entry"
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
      ) : (
        <p className="sub" style={{ marginTop: 12 }}>No backups taken yet.</p>
      )}
    </div>
  )
}

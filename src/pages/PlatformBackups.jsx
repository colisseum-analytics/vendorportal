import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { relativeTime } from '../utils/relativeTime'
import { usePageMeta } from '../hooks/usePageMeta.js'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function PlatformBackups() {
  usePageMeta({ title: 'Platform admin · Backups', noindex: true })

  const [backupLog, setBackupLog] = useState([])
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    const { data } = await supabase.from('backup_log').select('*').order('created_at', { ascending: false }).limit(20)
    setBackupLog(data || [])
  }

  useEffect(() => { load() }, [])

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
      {backupLog.length > 0 ? (
        <div className="user-list" style={{ marginTop: 16 }}>
          {backupLog.map((b) => (
            <div className="user-row" key={b.id}>
              <div className="user-row-main">
                <strong>{formatDate(b.created_at)} · {relativeTime(b.created_at)}</strong>
                <span className="user-row-meta">
                  {Object.entries(b.row_counts || {}).map(([k, v]) => `${v} ${k}`).join(' · ')}
                </span>
              </div>
              <div className="user-row-actions">
                <button className="btn-ghost danger" disabled={busyId === b.id} onClick={() => deleteBackupEntry(b.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="sub" style={{ marginTop: 12 }}>No backups taken yet.</p>
      )}
    </div>
  )
}

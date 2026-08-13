import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'
import FilterPill from '../components/FilterPill.jsx'
import Pagination from '../components/Pagination.jsx'
import NeedCard from '../components/NeedCard.jsx'
import PostNeedModal from '../components/PostNeedModal.jsx'
import { NEED_CATEGORIES, SEVERITIES, STATUSES, SEVERITY_LABEL_KEY, STATUS_LABEL_KEY } from '../utils/needConstants'

const PAGE_SIZE = 25

// Phase 3 of the Needs/Broadcast/Members feature: the needs list + post
// flow. Upvoting, vendor referrals, and the need-detail page land in
// later phases.
export default function ServiceBoard() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { t } = useLanguage()
  const { neighborhood, isMember, membershipUnit, reloadMembership } = useOutletContext()
  usePageMeta({ title: t('serviceBoard.title'), noindex: true })

  const [unit, setUnit] = useState('')
  const [role, setRole] = useState('owner')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  const [needs, setNeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(null)
  const [severity, setSeverity] = useState(null)
  const [status, setStatus] = useState(null)
  const [page, setPage] = useState(1)
  const [postOpen, setPostOpen] = useState(false)

  useEffect(() => {
    if (!isMember) return
    let active = true
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('needs')
        .select('*')
        .eq('neighborhood_id', neighborhood.id)
        .order('created_at', { ascending: false })
      if (!active) return
      setNeeds(data || [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [neighborhood.id, isMember])

  const refreshNeeds = async () => {
    const { data } = await supabase
      .from('needs')
      .select('*')
      .eq('neighborhood_id', neighborhood.id)
      .order('created_at', { ascending: false })
    setNeeds(data || [])
  }

  const join = async (e) => {
    e.preventDefault()
    if (!unit.trim()) return
    setJoining(true)
    setJoinError('')
    const { error } = await supabase
      .from('neighborhood_members')
      .insert({ neighborhood_id: neighborhood.id, user_id: user.id, unit: unit.trim(), role })
    setJoining(false)
    if (error) {
      setJoinError(error.message)
      return
    }
    reloadMembership()
  }

  const postNeed = async (form) => {
    const { error } = await supabase.from('needs').insert({
      neighborhood_id: neighborhood.id,
      author_id: user.id,
      title: form.title,
      description: form.description,
      category: form.category,
      severity: form.severity,
      unit: membershipUnit,
    })
    if (error) throw error
    setPostOpen(false)
    await refreshNeeds()
  }

  const filtered = useMemo(() => {
    return needs
      .filter((n) => !category || n.category === category)
      .filter((n) => !severity || n.severity === severity)
      .filter((n) => !status || n.status === status)
      .filter((n) => {
        if (!search) return true
        const hay = `${n.title} ${n.category || ''} ${n.description || ''} ${n.unit || ''}`.toLowerCase()
        return hay.includes(search.toLowerCase())
      })
  }, [needs, category, severity, status, search])

  useEffect(() => {
    setPage(1)
  }, [category, severity, status, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  if (!user) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>{t('serviceBoard.loginRequiredTitle')}</h1>
          <p className="sub">{t('serviceBoard.loginRequiredBody')}</p>
          <Link className="btn-primary" to={`/login?redirect=/n/${slug}/board`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            {t('serviceBoard.loginButton')}
          </Link>
        </div>
      </div>
    )
  }

  if (!isMember) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>{t('serviceBoard.joinTitle')}</h1>
          <p className="sub">{t('serviceBoard.joinBody')}</p>
          {joinError ? <div className="error-msg">{joinError}</div> : null}
          <form onSubmit={join}>
            <div className="field">
              <label>{t('serviceBoard.unitLabel')}</label>
              <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t('serviceBoard.unitPlaceholder')} autoFocus />
            </div>
            <div className="field">
              <label>{t('serviceBoard.roleLabel')}</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="owner">{t('serviceBoard.roleOwner')}</option>
                <option value="renter">{t('serviceBoard.roleRenter')}</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" disabled={joining} style={{ width: '100%' }}>
              {joining ? t('serviceBoard.joinSubmitting') : t('serviceBoard.joinSubmit')}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) return <div className="empty" style={{ marginTop: 20 }}>{t('common.loading')}</div>

  return (
    <div>
      <div className="controls controls-compact">
        <div className="search-box search-box-compact">
          <input type="text" placeholder={t('serviceBoard.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-pill-row">
          <FilterPill label={t('serviceBoard.filterCategory')} options={NEED_CATEGORIES} value={category} onChange={setCategory} />
          <FilterPill label={t('serviceBoard.filterSeverity')} options={SEVERITIES} value={severity} onChange={setSeverity} renderOption={(o) => t(SEVERITY_LABEL_KEY[o])} />
          <FilterPill label={t('serviceBoard.filterStatus')} options={STATUSES} value={status} onChange={setStatus} renderOption={(o) => t(STATUS_LABEL_KEY[o])} />
          {category || severity || status ? (
            <button type="button" className="filter-reset-btn" onClick={() => { setCategory(null); setSeverity(null); setStatus(null) }}>
              {t('serviceBoard.reset')} ×
            </button>
          ) : null}
        </div>
      </div>

      <div className="count-row-with-action">
        <div className="count-row">
          {t(needs.length === 1 ? 'serviceBoard.showingOne' : 'serviceBoard.showingOther', { shown: filtered.length, total: needs.length })}
        </div>
        <button type="button" className="btn-primary" onClick={() => setPostOpen(true)}>{t('serviceBoard.postButton')}</button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <strong>{t('serviceBoard.emptyTitle')}</strong>
          {needs.length === 0 ? t('serviceBoard.emptyBodyNoNeeds') : t('serviceBoard.emptyBodyNoMatch')}
        </div>
      ) : (
        <div className="grid">
          {pageItems.map((n) => <NeedCard key={n.id} need={n} />)}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {postOpen ? (
        <PostNeedModal onCancel={() => setPostOpen(false)} onSave={postNeed} />
      ) : null}
    </div>
  )
}

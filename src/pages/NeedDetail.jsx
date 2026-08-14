import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'
import ReferVendorModal from '../components/ReferVendorModal.jsx'
import BroadcastBanner from '../components/BroadcastBanner.jsx'
import { SEVERITY_LABEL_KEY, SEVERITY_BADGE_CLASS, STATUS_LABEL_KEY, STATUS_BADGE_CLASS } from '../utils/needConstants'
import { relativeTime } from '../utils/relativeTime'

// Phase 5 of the Needs/Broadcast/Members feature: the need-detail page and
// vendor referrals. The login/join gates here mirror ServiceBoard.jsx's —
// small enough (and stable enough there already) that duplicating beats
// refactoring both pages around a shared wrapper mid-build.
export default function NeedDetail() {
  const { slug, needId } = useParams()
  const { user } = useAuth()
  const { t } = useLanguage()
  const { neighborhood, isAdmin, isMember, reloadNeighborhood } = useOutletContext()

  const [unit, setUnit] = useState('')
  const [role, setRole] = useState('owner')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  const [need, setNeed] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [supporterIds, setSupporterIds] = useState([])
  const [vendors, setVendors] = useState([])
  const [referrals, setReferrals] = useState([])
  const [referOpen, setReferOpen] = useState(false)
  const [referError, setReferError] = useState('')
  const [broadcasts, setBroadcasts] = useState([])

  usePageMeta({ title: need?.title, noindex: true })

  const loadAll = async () => {
    const { data: n } = await supabase
      .from('needs')
      .select('*')
      .eq('id', needId)
      .eq('neighborhood_id', neighborhood.id)
      .maybeSingle()
    if (!n) {
      setNotFound(true)
      return
    }
    setNeed(n)
    const [{ data: supporters }, { data: v }, { data: refs }, { data: bc }] = await Promise.all([
      supabase.from('need_supporters').select('user_id').eq('need_id', needId),
      supabase.from('vendors').select('id, name, category, phone, website').eq('neighborhood_id', neighborhood.id).order('name'),
      supabase.from('need_vendor_referrals').select('*').eq('need_id', needId).order('created_at', { ascending: false }),
      supabase.from('broadcasts').select('*').eq('need_id', needId).order('created_at', { ascending: false }),
    ])
    setBroadcasts(bc || [])
    setSupporterIds((supporters || []).map((s) => s.user_id))
    setVendors(v || [])
    setReferrals(refs || [])
  }

  useEffect(() => {
    if (!isMember && !isAdmin) return
    let active = true
    async function load() {
      setLoading(true)
      await loadAll()
      if (active) setLoading(false)
    }
    load()
    return () => { active = false }
  }, [neighborhood.id, needId, isMember, isAdmin])

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
    reloadNeighborhood()
  }

  const toggleSupport = async () => {
    if (supporterIds.includes(user.id)) {
      await supabase.from('need_supporters').delete().eq('need_id', needId).eq('user_id', user.id)
    } else {
      await supabase.from('need_supporters').insert({ need_id: needId, user_id: user.id })
    }
    await loadAll()
  }

  const referVendor = async (form) => {
    setReferError('')
    const { error } = await supabase.from('need_vendor_referrals').insert({
      need_id: needId,
      vendor_id: form.vendor_id,
      referred_by: user.id,
      estimated_cost: form.estimated_cost,
      rating: form.rating,
      notes: form.notes,
    })
    if (error) throw error
    setReferOpen(false)
    await loadAll()
  }

  if (!user) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>{t('serviceBoard.loginRequiredTitle')}</h1>
          <p className="sub">{t('serviceBoard.loginRequiredBody')}</p>
          <Link className="btn-primary" to={`/login?redirect=/n/${slug}/board/${needId}`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            {t('serviceBoard.loginButton')}
          </Link>
        </div>
      </div>
    )
  }

  if (!isMember && !isAdmin) {
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

  if (notFound) {
    return (
      <div className="empty">
        <strong>{t('serviceBoard.needNotFoundTitle')}</strong>
        <Link to={`/n/${slug}/board`}>{t('serviceBoard.backToBoard')}</Link>
      </div>
    )
  }

  const supported = supporterIds.includes(user.id)

  return (
    <div>
      <p className="eyebrow"><Link to={`/n/${slug}/board`}>{t('serviceBoard.backToBoard')}</Link></p>

      {broadcasts.map((b) => <BroadcastBanner key={b.id} broadcast={b} />)}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-top">
          <div className="card-top-name">
            <h3 style={{ fontSize: 20 }}>{need.title}</h3>
            <div className="category">{need.category}</div>
          </div>
          <div className="card-top-actions">
            <span className={`badge ${SEVERITY_BADGE_CLASS[need.severity] || 'badge-neutral'}`}>{t(SEVERITY_LABEL_KEY[need.severity])}</span>
            <span className={`badge ${STATUS_BADGE_CLASS[need.status] || 'badge-neutral'}`}>{t(STATUS_LABEL_KEY[need.status])}</span>
          </div>
        </div>
        {need.description ? <p className="desc">{need.description}</p> : null}
        <div className="meta">
          {need.unit ? <div className="row"><span className="icon">⌂</span><span>{t('serviceBoard.unitPrefix')} {need.unit}</span></div> : null}
          <div className="row"><span className="icon">🕐</span><span>{relativeTime(need.created_at)}</span></div>
        </div>
        <div className="card-admin-actions">
          <button type="button" className={`support-btn ${supported ? 'supported' : ''}`} onClick={toggleSupport}>
            <span>▲ {supporterIds.length}</span>
            <span>{t('serviceBoard.supportButton')}</span>
          </button>
        </div>
      </div>

      <div className="count-row-with-action">
        <h2 className="section-title" style={{ margin: 0 }}>
          {referrals.length === 1 ? t('serviceBoard.referralsTitleOne', { count: referrals.length }) : t('serviceBoard.referralsTitleOther', { count: referrals.length })}
        </h2>
        <button type="button" className="btn-ghost" onClick={() => setReferOpen(true)}>{t('serviceBoard.referButton')}</button>
      </div>
      {referError ? <div className="error-msg">{referError}</div> : null}

      {referrals.length === 0 ? (
        <p className="sub">{t('serviceBoard.noReferralsYet')}</p>
      ) : (
        <div className="message-list">
          {referrals.map((r) => {
            const vendor = vendors.find((v) => v.id === r.vendor_id)
            return (
              <div key={r.id} className="message-item">
                <div className="message-item-head">
                  <span className="message-from">{vendor?.name || t('serviceBoard.vendorNoLongerListed')}</span>
                  <span className="message-time">{relativeTime(r.created_at)}</span>
                </div>
                {vendor?.phone ? <p className="message-text">☏ {vendor.phone}</p> : null}
                {r.rating ? <p className="message-text">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p> : null}
                {r.estimated_cost != null ? <p className="message-text">{t('serviceBoard.estCostPrefix')} ${r.estimated_cost}</p> : null}
                {r.notes ? <p className="message-text">{r.notes}</p> : null}
              </div>
            )
          })}
        </div>
      )}

      {referOpen ? (
        <ReferVendorModal
          vendors={vendors}
          onCancel={() => setReferOpen(false)}
          onSave={referVendor}
        />
      ) : null}
    </div>
  )
}

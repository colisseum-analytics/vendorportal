import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../context/LanguageContext.jsx'

function normalizeUrl(u) {
  if (!u) return ''
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

function groupBySubsection(items) {
  const groups = []
  const byKey = {}
  for (const item of items) {
    const key = item.subsection || ''
    if (!byKey[key]) {
      byKey[key] = { subsection: item.subsection, items: [] }
      groups.push(byKey[key])
    }
    byKey[key].items.push(item)
  }
  return groups
}

export default function NeighborhoodInfoSection({ section }) {
  const { neighborhood } = useOutletContext()
  const { t } = useLanguage()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('neighborhood_info_items')
        .select('*')
        .eq('neighborhood_id', neighborhood.id)
        .eq('section', section)
        .order('subsection', { ascending: true, nullsFirst: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (!active) return
      setItems(data || [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [neighborhood.id, section])

  if (loading) return <div className="empty" style={{ marginTop: 20 }}>{t('common.loading')}</div>

  if (items.length === 0) {
    return (
      <div className="empty">
        <strong>{t('infoSection.emptyTitle')}</strong>
        {t('infoSection.emptyBody')}
      </div>
    )
  }

  if (section === 'faq') {
    return (
      <div className="faq-list">
        {items.map((item) => (
          <div key={item.id} className="faq-item">
            <h3 className="faq-question">{item.title}</h3>
            {item.body ? <p className="faq-answer">{item.body}</p> : null}
            {item.category ? (
              <Link to={`/n/${neighborhood.slug}?category=${encodeURIComponent(item.category)}`} className="faq-vendor-card">
                <strong>{item.category}</strong>
                <span className="faq-vendor-card-cta">{t('infoSection.viewCategoryInDirectory')} →</span>
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {groupBySubsection(items).map((group) => (
        <div key={group.subsection || 'general'} className="info-subgroup">
          {group.subsection ? <h3 className="overview-subgroup-title">{group.subsection}</h3> : null}
          <div className="info-item-list">
            {group.items.map((item) => (
              <div key={item.id} className="info-item-card">
                <strong>{item.title}</strong>
                {item.body ? <p className="info-item-notes">{item.body}</p> : null}
                <div className="info-item-meta">
                  {item.phone ? (
                    <div className="row"><span className="icon">☏</span><a href={`tel:${item.phone}`}>{item.phone}</a></div>
                  ) : null}
                  {item.email ? (
                    <div className="row"><span className="icon">✉</span><a href={`mailto:${item.email}`}>{item.email}</a></div>
                  ) : null}
                  {item.website ? (
                    <div className="row">
                      <span className="icon">↗</span>
                      <a href={normalizeUrl(item.website)} target="_blank" rel="noopener noreferrer">
                        {item.website.replace(/^https?:\/\//i, '')}
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../context/LanguageContext.jsx'
import { answerQuestion } from '../utils/chatAnswer'
import { buildShareListText, whatsappHref } from '../utils/shareList'

function formatAnswer(match, t) {
  if (match.type === 'emergency') {
    const lines = [t('chatWidget.emergencyWarning')]
    for (const item of match.items) {
      const parts = [item.title]
      if (item.phone) parts.push(`☏ ${item.phone}`)
      lines.push(parts.join(' — '))
    }
    return lines.join('\n')
  }
  if (match.type === 'vendors') {
    const verified = match.vendors.filter((v) => v.status === 'Verified')
    const shown = (verified.length ? verified : match.vendors).slice(0, 3)
    const lines = shown.map((v) => `• ${v.name}${v.phone ? ` — ${v.phone}` : ''}${v.specialty ? ` (${v.specialty})` : ''}`)
    return `${t('chatWidget.vendorsListedUnder', { category: match.category })}\n${lines.join('\n')}`
  }
  const item = match.item
  const lines = [item.title]
  if (item.body) lines.push(item.body)
  if (item.phone) lines.push(`☏ ${item.phone}`)
  if (item.email) lines.push(`✉ ${item.email}`)
  if (item.website) lines.push(`↗ ${item.website}`)
  return lines.join('\n')
}

export default function ChatWidget({ neighborhood, onContactAdmins }) {
  const { t, tCategory } = useLanguage()
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [data, setData] = useState({ vendors: [], infoItems: [] })
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)

  const STARTERS = [t('chatWidget.starter1'), t('chatWidget.starter2'), t('chatWidget.starter3')]

  useEffect(() => {
    if (!open || loaded) return
    let active = true
    async function load() {
      const [{ data: vendors }, { data: infoItems }] = await Promise.all([
        supabase.from('vendors').select('name, categories, specialty, phone, status').eq('neighborhood_id', neighborhood.id),
        supabase.from('neighborhood_info_items').select('*').eq('neighborhood_id', neighborhood.id),
      ])
      if (!active) return
      setData({ vendors: vendors || [], infoItems: infoItems || [] })
      setLoaded(true)
    }
    load()
    return () => { active = false }
  }, [open, loaded, neighborhood.id])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open])

  const ask = (question) => {
    const q = question.trim()
    if (!q) return
    setMessages((m) => [...m, { role: 'user', text: q }])
    setInput('')
    const match = answerQuestion(q, data)
    if (match) {
      const bot = { role: 'bot', text: formatAnswer(match, t) }
      if (match.type === 'vendors') {
        // Same count-and-link message as the directory's Share list button.
        bot.shareText = buildShareListText({
          t,
          slug: neighborhood.slug,
          neighborhoodName: neighborhood.name,
          label: tCategory(match.category),
          count: match.vendors.length,
          category: match.category,
        })
      }
      setMessages((m) => [...m, bot])
    } else {
      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          text: t('chatWidget.noAnswer'),
          action: { label: t('chatWidget.contactAssociation'), onClick: onContactAdmins },
        },
      ])
    }
  }

  const copyShare = async (text, i) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(i)
      setTimeout(() => setCopiedIdx(null), 1800)
    } catch {
      // clipboard unavailable (e.g. insecure context) — fail silently
    }
  }

  const submit = (e) => {
    e.preventDefault()
    ask(input)
  }

  return (
    <div className="chat-widget">
      {open ? (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <span>{t('chatWidget.header', { name: neighborhood.name })} <span className="chat-beta-badge">{t('chatWidget.beta')}</span></span>
            <button type="button" className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </div>
          <div className="chat-panel-body" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="chat-greeting">
                <p>{t('chatWidget.greeting')}</p>
                <div className="chat-starters">
                  {STARTERS.map((s) => (
                    <button key={s} type="button" className="chat-starter-btn" onClick={() => ask(s)}>{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`chat-bubble chat-bubble-${m.role}`}>
                  <p style={{ whiteSpace: 'pre-line' }}>{m.text}</p>
                  {m.shareText ? (
                    <div className="chat-share-row">
                      <a className="share-list-btn" href={whatsappHref(m.shareText)} target="_blank" rel="noopener noreferrer">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.93 9.93 0 0 0-8.5 15.1L2 22l5-1.5A9.94 9.94 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3 .88.9-2.9-.2-.3a8.2 8.2 0 1 1 6.8 3.65Z" /></svg>
                        {t('directory.shareList')}
                      </a>
                      <button type="button" className={`share-list-btn ${copiedIdx === i ? 'copied' : ''}`} onClick={() => copyShare(m.shareText, i)}>
                        {copiedIdx === i ? t('directory.copiedList') : t('directory.copyList')}
                      </button>
                    </div>
                  ) : null}
                  {m.action ? (
                    <button type="button" className="btn-secondary chat-action-btn" onClick={m.action.onClick}>{m.action.label}</button>
                  ) : null}
                </div>
              ))
            )}
          </div>
          <form className="chat-panel-input" onSubmit={submit}>
            <input
              type="text"
              placeholder={t('chatWidget.placeholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={!input.trim()}>{t('chatWidget.send')}</button>
          </form>
        </div>
      ) : (
        <button type="button" className="chat-fab" onClick={() => setOpen(true)}>
          💬 {t('chatWidget.launcher')} <span className="chat-beta-badge">{t('chatWidget.beta')}</span>
        </button>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../context/LanguageContext.jsx'
import { answerQuestion } from '../utils/chatAnswer'

function formatAnswer(match, t) {
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
  const { t } = useLanguage()
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
      setMessages((m) => [...m, { role: 'bot', text: formatAnswer(match, t) }])
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

  const submit = (e) => {
    e.preventDefault()
    ask(input)
  }

  return (
    <div className="chat-widget">
      {open ? (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <span>{t('chatWidget.header', { name: neighborhood.name })}</span>
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
          💬 {t('chatWidget.launcher')}
        </button>
      )}
    </div>
  )
}

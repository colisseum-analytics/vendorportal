import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function VerifyRequest() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // verifying | done | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let active = true

    async function verify() {
      const { error } = await supabase.rpc('verify_my_pending_request')
      if (!active) return
      if (error) {
        setStatus('error')
        setErrorMsg(error.message)
        return
      }
      setStatus('done')
    }

    // Clicking the emailed magic link redirects here with a token in the
    // URL; supabase-js exchanges it for a session automatically and fires
    // this event once that's done.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') verify()
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) verify()
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  if (status === 'verifying') {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>{t('verifyRequest.verifyingTitle')}</h1>
          <p className="sub">{t('verifyRequest.verifyingBody')}</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>{t('verifyRequest.errorTitle')}</h1>
          <p className="sub">{errorMsg || t('verifyRequest.errorBody')}</p>
          <Link className="btn-ghost" to="/new">{t('verifyRequest.backToStart')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap-narrow">
      <div className="auth-card">
        <h1>{t('verifyRequest.doneTitle')}</h1>
        <p className="sub">{t('verifyRequest.doneBody')}</p>
        <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/')}>
          {t('verifyRequest.doneContinue')}
        </button>
      </div>
    </div>
  )
}

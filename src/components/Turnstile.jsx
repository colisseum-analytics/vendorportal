import { useCallback, useEffect, useRef, useState } from 'react'

// Public by design — the secret key lives only in Supabase (Authentication →
// Attack Protection). Override per-environment with VITE_TURNSTILE_SITE_KEY.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAFHS_QkDN2rkV66O'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let scriptPromise
function loadScript() {
  if (window.turnstile) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SCRIPT_SRC
      s.async = true
      s.onload = resolve
      s.onerror = () => { scriptPromise = null; reject(new Error('Turnstile failed to load')) }
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

// Tokens are single-use: call resetCaptcha() after every request that
// consumed one so the next attempt gets a fresh token.
export function useTurnstile() {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const [captchaToken, setCaptchaToken] = useState(null)

  useEffect(() => {
    let cancelled = false
    loadScript().then(() => {
      if (cancelled || !containerRef.current || widgetIdRef.current !== null) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(null),
        'error-callback': () => setCaptchaToken(null),
      })
    }).catch(() => {})
    return () => {
      cancelled = true
      if (widgetIdRef.current !== null && window.turnstile) window.turnstile.remove(widgetIdRef.current)
      widgetIdRef.current = null
    }
  }, [])

  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null)
    if (widgetIdRef.current !== null && window.turnstile) window.turnstile.reset(widgetIdRef.current)
  }, [])

  const captcha = <div ref={containerRef} className="turnstile-box" />
  return { captchaToken, captcha, resetCaptcha }
}

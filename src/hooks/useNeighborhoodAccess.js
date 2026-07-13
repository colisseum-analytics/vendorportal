import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'

// Loads a neighborhood by slug and checks whether the current user is
// one of its admins. Shared by every admin-only page so the access
// check lives in exactly one place.
export function useNeighborhoodAccess(slug) {
  const { user, loading: authLoading } = useAuth()
  const [neighborhood, setNeighborhood] = useState(null)
  const [isAdmin, setIsAdmin] = useState(null) // null = not checked yet
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    let active = true
    async function load() {
      setLoading(true)
      const { data: n } = await supabase.from('neighborhoods').select('*').eq('slug', slug).maybeSingle()
      if (!active) return
      if (!n) { setNotFound(true); setLoading(false); return }
      setNeighborhood(n)

      const { data: admin } = await supabase
        .from('neighborhood_admins')
        .select('user_id')
        .eq('neighborhood_id', n.id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!active) return
      setIsAdmin(!!admin)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [slug, user, authLoading, reloadKey])

  return {
    user,
    authLoading,
    neighborhood,
    setNeighborhood,
    isAdmin,
    loading,
    notFound,
    reload: () => setReloadKey((k) => k + 1),
  }
}

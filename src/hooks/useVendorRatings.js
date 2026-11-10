import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'

// Recommendation counts for every vendor in one neighborhood.
//
// `available` stays false until the vendor_rating_summary() function exists
// and answers, so deploying this code before the database migration is run
// (or if the call ever fails) simply shows no recommendation UI — it never
// breaks the directory.
export function useVendorRatings(neighborhoodId) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ratings, setRatings] = useState({})
  const [available, setAvailable] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('vendor_rating_summary', { p_neighborhood_id: neighborhoodId })
    if (error || !Array.isArray(data)) {
      setAvailable(false)
      return
    }
    const map = {}
    for (const r of data) {
      map[r.vendor_id] = { total: Number(r.total), neighbors: Number(r.neighbors), mine: !!r.mine }
    }
    setRatings(map)
    setAvailable(true)
  }, [neighborhoodId])

  // Re-run on sign-in/out so `mine` reflects the current person.
  useEffect(() => { load() }, [load, user?.id])

  const toggle = useCallback(async (vendorId) => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }
    const current = ratings[vendorId] || { total: 0, neighbors: 0, mine: false }
    // Optimistic update; the reload below replaces it with the real counts
    // (including whether this person counts as a neighbor).
    setRatings((r) => ({
      ...r,
      [vendorId]: {
        ...current,
        mine: !current.mine,
        total: Math.max(0, current.total + (current.mine ? -1 : 1)),
      },
    }))
    const { error } = current.mine
      ? await supabase.from('vendor_ratings').delete().eq('vendor_id', vendorId).eq('user_id', user.id)
      : await supabase.from('vendor_ratings').insert({ vendor_id: vendorId, user_id: user.id, neighborhood_id: neighborhoodId })
    // A duplicate (23505) means it was already recorded — same end state.
    if (error && error.code !== '23505') setRatings((r) => ({ ...r, [vendorId]: current }))
    load()
  }, [user, ratings, neighborhoodId, navigate, load])

  return { ratings, available, toggle }
}

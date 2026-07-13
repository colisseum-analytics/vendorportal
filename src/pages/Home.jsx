import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'

export default function Home() {
  const { user, signOut } = useAuth()
  const [neighborhoods, setNeighborhoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    supabase
      .from('neighborhoods')
      .select('id, slug, name, tagline')
      .order('name')
      .then(({ data, error }) => {
        if (!active) return
        if (!error) setNeighborhoods(data || [])
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  const filtered = neighborhoods.filter((n) =>
    (n.name + ' ' + (n.tagline || '')).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="wrap">
      <div className="masthead">
        <div>
          <p className="eyebrow">Neighborhood Directory</p>
          <h1>Find your neighborhood</h1>
          <p className="tagline">Browse local vendor directories run by residents, or start one for a neighborhood that doesn't have one yet.</p>
        </div>
        <div className="admin-corner">
          {user ? (
            <>
              <div className="admin-pill"><span className="dot" />{user.email}</div><br />
              <button className="btn-ghost" onClick={signOut}>Log out</button>
            </>
          ) : (
            <Link className="btn-ghost" to="/login">Log in</Link>
          )}
        </div>
      </div>

      <div className="cta-banner">
        <div>
          <h2>Don't see your neighborhood?</h2>
          <p>Start a directory in a couple of minutes — you'll be the first admin automatically.</p>
        </div>
        <Link className="btn-invert" to="/new">Start a directory →</Link>
      </div>

      <div className="controls">
        <div className="search-box">
          <input type="text" placeholder="Search neighborhoods…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="empty">Loading neighborhoods…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <strong>No neighborhoods yet</strong>
          Be the first — start a directory above.
        </div>
      ) : (
        <div className="n-list">
          {filtered.map((n) => (
            <Link key={n.id} to={`/n/${n.slug}`} className="n-row">
              <div>
                <h3>{n.name}</h3>
                {n.tagline ? <p>{n.tagline}</p> : null}
              </div>
              <span className="arrow">→</span>
            </Link>
          ))}
        </div>
      )}

      <footer className="site-footer">A directory platform run by neighbors, for neighbors.</footer>
    </div>
  )
}

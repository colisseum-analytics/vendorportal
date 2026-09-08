import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import ActionMenu from './ActionMenu.jsx'

// Add/rename/delete a neighborhood's vendor categories. Every change saves
// immediately (not tied to the rest of the settings form) since renaming
// has a side effect — it needs to cascade to every vendor currently using
// the old name — that shouldn't be silently discarded if the admin never
// hits the page's main "Save changes" button.
export default function CategoryManager({ neighborhood, onChanged }) {
  const categories = neighborhood.categories || []
  // Rename/delete operate by position in the raw (unsorted) `categories`
  // array — this pairs each name with that original index so the list can
  // display alphabetically without disturbing that indexing.
  const sortedEntries = useMemo(
    () => categories.map((name, index) => ({ name, index })).sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  )
  const [newCat, setNewCat] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [counts, setCounts] = useState({})

  useEffect(() => {
    let active = true
    supabase.from('vendors').select('categories').eq('neighborhood_id', neighborhood.id).then(({ data }) => {
      if (!active || !data) return
      const next = {}
      for (const v of data) {
        for (const c of v.categories || []) next[c] = (next[c] || 0) + 1
      }
      setCounts(next)
    })
    return () => { active = false }
  }, [neighborhood.id])

  const saveCategories = async (next) => {
    setBusy(true)
    setError('')
    const { error: updateError } = await supabase.from('neighborhoods').update({ categories: next }).eq('id', neighborhood.id)
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return false
    }
    onChanged()
    return true
  }

  const addCategory = async () => {
    const name = newCat.trim()
    if (!name) return
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setError('That category already exists.')
      return
    }
    if (await saveCategories([...categories, name])) setNewCat('')
  }

  const startEdit = (i) => {
    setEditingIndex(i)
    setEditValue(categories[i])
    setError('')
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setError('')
  }

  const saveEdit = async () => {
    const oldName = categories[editingIndex]
    const newName = editValue.trim()
    if (!newName) {
      setError('Category name cannot be empty.')
      return
    }
    if (newName.toLowerCase() !== oldName.toLowerCase() && categories.some((c, i) => i !== editingIndex && c.toLowerCase() === newName.toLowerCase())) {
      setError('That category already exists.')
      return
    }
    if (newName !== oldName) {
      setBusy(true)
      setError('')
      // Array column — rewrite each affected vendor's categories client-side
      // (swap oldName for newName, keep every other entry) rather than a
      // single .update(), since PostgREST can't rename one jsonb-array
      // element across rows in place.
      const { data: affected, error: fetchError } = await supabase
        .from('vendors')
        .select('id, categories')
        .eq('neighborhood_id', neighborhood.id)
        .contains('categories', [oldName])
      if (fetchError) {
        setBusy(false)
        setError(fetchError.message)
        return
      }
      const results = await Promise.all(
        (affected || []).map((v) =>
          supabase.from('vendors').update({ categories: v.categories.map((c) => (c === oldName ? newName : c)) }).eq('id', v.id)
        )
      )
      setBusy(false)
      const vendorError = results.find((r) => r.error)?.error
      if (vendorError) {
        setError(vendorError.message)
        return
      }
      setCounts((c) => {
        const { [oldName]: moved, ...rest } = c
        return { ...rest, [newName]: moved || 0 }
      })
    }
    const next = categories.map((c, i) => (i === editingIndex ? newName : c))
    if (await saveCategories(next)) setEditingIndex(null)
  }

  const removeCategory = async (i) => {
    const name = categories[i]
    const { count } = await supabase
      .from('vendors')
      .select('id', { count: 'exact', head: true })
      .eq('neighborhood_id', neighborhood.id)
      .contains('categories', [name])
    if (count > 0) {
      const ok = window.confirm(
        `${count} vendor${count === 1 ? '' : 's'} currently use "${name}". They'll keep that category until you edit them individually — remove it from the list anyway?`
      )
      if (!ok) return
    }
    await saveCategories(categories.filter((_, idx) => idx !== i))
  }

  return (
    <div className="category-manager">
      {error ? <div className="error-msg">{error}</div> : null}
      {categories.length > 0 ? (
        <ul className="category-manager-list">
          {sortedEntries.map(({ name: c, index: i }) => (
            <li key={i}>
              {editingIndex === i ? (
                <>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit() } }}
                    autoFocus
                  />
                  <button type="button" className="btn-ghost" disabled={busy} onClick={saveEdit}>Save</button>
                  <button type="button" className="btn-ghost" disabled={busy} onClick={cancelEdit}>Cancel</button>
                </>
              ) : (
                <>
                  <span>{c} <span className="filter-pill-count">({counts[c] || 0})</span></span>
                  <ActionMenu
                    items={[
                      { label: 'Rename', onClick: () => startEdit(i), disabled: busy },
                      { label: 'Delete', onClick: () => removeCategory(i), disabled: busy, danger: true },
                    ]}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="sub">No categories yet — add one below.</p>
      )}
      <div className="category-manager-add">
        <input
          type="text"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          placeholder="New category name"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
        />
        <button type="button" className="btn-secondary" disabled={busy} onClick={addCategory}>Add</button>
      </div>
      <div className="hint">
        Renaming a category updates every vendor currently using it. Deleting one only removes it from this list —
        affected vendors keep their existing category until you edit them individually.
      </div>
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '../supabaseClient'
import ActionMenu from './ActionMenu.jsx'

// Add/rename/delete a neighborhood's vendor categories. Every change saves
// immediately (not tied to the rest of the settings form) since renaming
// has a side effect — it needs to cascade to every vendor currently using
// the old name — that shouldn't be silently discarded if the admin never
// hits the page's main "Save changes" button.
export default function CategoryManager({ neighborhood, onChanged }) {
  const categories = neighborhood.categories || []
  const [newCat, setNewCat] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
      const { error: vendorError } = await supabase
        .from('vendors')
        .update({ category: newName })
        .eq('neighborhood_id', neighborhood.id)
        .eq('category', oldName)
      setBusy(false)
      if (vendorError) {
        setError(vendorError.message)
        return
      }
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
      .eq('category', name)
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
          {categories.map((c, i) => (
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
                  <span>{c}</span>
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

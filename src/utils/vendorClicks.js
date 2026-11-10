import { supabase } from '../supabaseClient'

// Fire-and-forget: counts a tap on a vendor's phone or website. Never
// blocks the tap and never surfaces an error (including when the database
// function doesn't exist yet).
export function recordVendorClick(vendorId, kind) {
  try {
    Promise.resolve(supabase.rpc('record_vendor_click', { p_vendor_id: vendorId, p_kind: kind })).catch(() => {})
  } catch {
    // ignore
  }
}

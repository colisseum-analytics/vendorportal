import { usePageMeta } from '../hooks/usePageMeta.js'

// Admin pages aren't localized elsewhere in this app (see
// NeighborhoodSidebar's ADMIN_ITEMS) -- matching that convention here
// rather than introducing bilingual admin content on its own.
const SECTIONS = [
  {
    title: 'Managing vendors',
    body: 'Add, edit, or remove vendor listings from the Vendors tab. Mark a listing Verified once you\'ve confirmed it\'s a real, reliable business, and flag it as resident-recommended if a neighbor vouches for it. Use Import/Export to bulk-update your whole vendor list from a spreadsheet instead of one at a time.',
  },
  {
    title: 'Messages',
    body: 'Every issue or idea residents send through Feedback lands here. Mark one resolved once you\'ve handled it (it moves into a collapsed archive, not deleted), or reopen it if it needs another look.',
  },
  {
    title: 'Residents',
    body: 'See everyone who has joined your Service Board. You can also add a resident directly yourself, without waiting for them to join on their own — handy for getting your roster started.',
  },
  {
    title: 'Community Info',
    body: 'Edit your Association Contacts, Community Services, Emergency, and FAQ sections here — these are exactly what residents see on those same tabs. Group related entries with a subsection label, link an FAQ answer to a vendor category so residents can jump straight to relevant listings, and use "Import from document" to have a PDF, Word doc, or text file (like an HOA handbook or management FAQ) automatically turned into draft entries you review before anything goes live.',
  },
  {
    title: 'Service Board (admin view)',
    body: 'Moderate what residents post, and send a broadcast to pin an announcement at the top of the board for everyone to see.',
  },
  {
    title: 'Configuration',
    body: 'Update your neighborhood\'s name, tagline, city, logo, and the vendor categories available in your directory. Invite another admin by email — if they don\'t have an account yet, they\'re promoted automatically the moment they sign up with that email.',
  },
]

export default function AdminHelpPage() {
  usePageMeta({ title: 'Admin help', noindex: true })

  return (
    <div className="wrap">
      <div style={{ margin: '20px 0 10px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 28, margin: '0 0 4px' }}>Admin help</h1>
        <p className="tagline">How to run your neighborhood's directory — in addition to everything covered in the regular Help page.</p>
      </div>

      {SECTIONS.map((s) => (
        <div className="overview-subgroup" key={s.title} style={{ marginBottom: 18 }}>
          <h3 className="overview-subgroup-title">{s.title}</h3>
          <p className="sub">{s.body}</p>
        </div>
      ))}
    </div>
  )
}

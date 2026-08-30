import { NavLink, useParams } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'

// Admin labels are plain English, matching the existing convention that
// admin pages aren't localized (see AdminDashboard.jsx etc).
const ADMIN_ITEMS = [
  { path: 'admin', label: 'Vendors', icon: '🛠', end: true },
  { path: 'admin/messages', label: 'Messages', icon: '✉' },
  { path: 'admin/residents', label: 'Residents', icon: '👥' },
  { path: 'admin/info', label: 'Community Info', icon: '📋' },
  { path: 'admin/board', label: 'Service Board', icon: '🛎' },
  { path: 'admin/settings', label: 'Configuration', icon: '⚙' },
  { path: 'admin/help', label: 'Admin Help', icon: '📖' },
]

export default function NeighborhoodSidebar({ isAdmin, user, onContactAdmins }) {
  const { slug } = useParams()
  const { t } = useLanguage()

  const publicItems = [
    { to: `/n/${slug}`, label: t('nav.vendors'), icon: '🛠', end: true },
    { to: `/n/${slug}/hoa-contacts`, label: t('nav.hoaContacts'), icon: '☎' },
    { to: `/n/${slug}/community-services`, label: t('nav.communityServices'), icon: '🧰' },
    { to: `/n/${slug}/emergency`, label: t('nav.emergency'), icon: '⚠' },
    { to: `/n/${slug}/faq`, label: t('nav.faq'), icon: '❓' },
  ]
  // Below the divider: the two things that actually require being
  // logged in (posting/joining the board, and account settings), kept
  // visually apart from the always-public directory pages above.
  const authItems = [
    { to: `/n/${slug}/board`, label: t('nav.serviceBoard'), icon: '🛎' },
    ...(user ? [{ to: `/n/${slug}/settings`, label: t('nav.settings'), icon: '👤' }] : []),
  ]

  return (
    <nav className="neighborhood-sidebar">
      <div className="sidebar-group">
        <p className="sidebar-group-label">Directory</p>
        {publicItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>{item.label}
          </NavLink>
        ))}
        <button type="button" className="sidebar-link" onClick={onContactAdmins}>
          <span className="sidebar-link-icon">💬</span>{t('directory.contactAdmins')}
        </button>
        <NavLink
          to={`/n/${slug}/help`}
          className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
        >
          <span className="sidebar-link-icon">📖</span>{t('nav.help')}
        </NavLink>
        <hr className="sidebar-divider" />
        {authItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>{item.label}
          </NavLink>
        ))}
      </div>

      {isAdmin ? (
        <div className="sidebar-group">
          <p className="sidebar-group-label">Admin</p>
          {ADMIN_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={`/n/${slug}/${item.path}`}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>{item.label}
            </NavLink>
          ))}
        </div>
      ) : null}
    </nav>
  )
}

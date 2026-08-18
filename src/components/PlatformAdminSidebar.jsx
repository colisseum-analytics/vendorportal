import { NavLink } from 'react-router-dom'

const ITEMS = [
  { to: '/platform-admin', label: 'Messages', icon: '✉', end: true },
  { to: '/platform-admin/requests', label: 'Pending Requests', icon: '📥' },
  { to: '/platform-admin/neighborhoods', label: 'Neighborhoods', icon: '🏘' },
  { to: '/platform-admin/users', label: 'Users', icon: '👥' },
  { to: '/platform-admin/backups', label: 'Backups', icon: '💾' },
  { to: '/platform-admin/history', label: 'History', icon: '🕐' },
]

export default function PlatformAdminSidebar() {
  return (
    <nav className="neighborhood-sidebar">
      <div className="sidebar-group">
        <p className="sidebar-group-label">Platform Admin</p>
        {ITEMS.map((item) => (
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
    </nav>
  )
}

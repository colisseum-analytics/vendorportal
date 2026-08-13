import { NavLink } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function NeighborhoodNav({ slug }) {
  const { t } = useLanguage()

  const items = [
    { to: `/n/${slug}`, label: t('nav.vendors'), end: true },
    { to: `/n/${slug}/hoa-contacts`, label: t('nav.hoaContacts') },
    { to: `/n/${slug}/community-services`, label: t('nav.communityServices') },
    { to: `/n/${slug}/emergency`, label: t('nav.emergency') },
    { to: `/n/${slug}/faq`, label: t('nav.faq') },
    { to: `/n/${slug}/board`, label: t('nav.serviceBoard') },
  ]

  return (
    <nav className="neighborhood-nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `neighborhood-nav-link ${isActive ? 'neighborhood-nav-link-active' : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

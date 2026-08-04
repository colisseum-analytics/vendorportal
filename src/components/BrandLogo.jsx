import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext.jsx'
import logoLight from '../assets/logo-light.png'
import logoDark from '../assets/logo-dark.png'

export default function BrandLogo() {
  const { theme } = useTheme()
  return (
    <Link to="/" className="brand-logo">
      <img src={theme === 'dark' ? logoDark : logoLight} alt="LoopListing" />
    </Link>
  )
}

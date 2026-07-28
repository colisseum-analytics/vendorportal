import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import CreateNeighborhood from './pages/CreateNeighborhood.jsx'
import NeighborhoodDirectory from './pages/NeighborhoodDirectory.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminSettings from './pages/AdminSettings.jsx'
import PlatformAdmin from './pages/PlatformAdmin.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'

export default function App() {
  return (
    <>
      <div className="theme-toggle-corner"><ThemeToggle /></div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/new" element={<CreateNeighborhood />} />
        <Route path="/n/:slug" element={<NeighborhoodDirectory />} />
        <Route path="/n/:slug/admin" element={<AdminDashboard />} />
        <Route path="/n/:slug/admin/settings" element={<AdminSettings />} />
        <Route path="/platform-admin" element={<PlatformAdmin />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  )
}

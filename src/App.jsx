import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import CreateNeighborhood from './pages/CreateNeighborhood.jsx'
import VerifyRequest from './pages/VerifyRequest.jsx'
import BrowseVendors from './pages/BrowseVendors.jsx'
import NeighborhoodDirectory from './pages/NeighborhoodDirectory.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminSettings from './pages/AdminSettings.jsx'
import PlatformAdmin from './pages/PlatformAdmin.jsx'
import SiteHeader from './components/SiteHeader.jsx'

export default function App() {
  return (
    <>
      <SiteHeader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/new" element={<CreateNeighborhood />} />
        <Route path="/verify-request" element={<VerifyRequest />} />
        <Route path="/browse" element={<BrowseVendors />} />
        <Route path="/n/:slug" element={<NeighborhoodDirectory />} />
        <Route path="/n/:slug/admin" element={<AdminDashboard />} />
        <Route path="/n/:slug/admin/settings" element={<AdminSettings />} />
        <Route path="/platform-admin" element={<PlatformAdmin />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  )
}

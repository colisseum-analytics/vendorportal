import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import CreateNeighborhood from './pages/CreateNeighborhood.jsx'
import VerifyRequest from './pages/VerifyRequest.jsx'
import BrowseVendors from './pages/BrowseVendors.jsx'
import NeighborhoodLayout from './pages/NeighborhoodLayout.jsx'
import NeighborhoodDirectory from './pages/NeighborhoodDirectory.jsx'
import NeighborhoodInfoSection from './pages/NeighborhoodInfoSection.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminCommunityInfo from './pages/AdminCommunityInfo.jsx'
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
        <Route path="/signup" element={<Login />} />
        <Route path="/new" element={<CreateNeighborhood />} />
        <Route path="/verify-request" element={<VerifyRequest />} />
        <Route path="/browse" element={<BrowseVendors />} />
        <Route path="/n/:slug" element={<NeighborhoodLayout />}>
          <Route index element={<NeighborhoodDirectory />} />
          <Route path="hoa-contacts" element={<NeighborhoodInfoSection section="hoa_contacts" />} />
          <Route path="community-services" element={<NeighborhoodInfoSection section="community_services" />} />
          <Route path="emergency" element={<NeighborhoodInfoSection section="emergency" />} />
          <Route path="faq" element={<NeighborhoodInfoSection section="faq" />} />
        </Route>
        <Route path="/n/:slug/admin" element={<AdminDashboard />} />
        <Route path="/n/:slug/admin/info" element={<AdminCommunityInfo />} />
        <Route path="/n/:slug/admin/settings" element={<AdminSettings />} />
        <Route path="/platform-admin" element={<PlatformAdmin />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  )
}

import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import CreateNeighborhood from './pages/CreateNeighborhood.jsx'
import VerifyRequest from './pages/VerifyRequest.jsx'
import BrowseVendors from './pages/BrowseVendors.jsx'
import NeighborhoodLayout from './pages/NeighborhoodLayout.jsx'
import NeighborhoodDirectory from './pages/NeighborhoodDirectory.jsx'
import NeighborhoodInfoSection from './pages/NeighborhoodInfoSection.jsx'
import ServiceBoard from './pages/ServiceBoard.jsx'
import NeedDetail from './pages/NeedDetail.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminMessages from './pages/AdminMessages.jsx'
import AdminCommunityInfo from './pages/AdminCommunityInfo.jsx'
import AdminSettings from './pages/AdminSettings.jsx'
import AdminServicePanel from './pages/AdminServicePanel.jsx'
import AdminResidents from './pages/AdminResidents.jsx'
import AccountSettings from './pages/AccountSettings.jsx'
import PlatformAdminLayout from './pages/PlatformAdminLayout.jsx'
import PlatformMessages from './pages/PlatformMessages.jsx'
import PlatformRequests from './pages/PlatformRequests.jsx'
import PlatformNeighborhoods from './pages/PlatformNeighborhoods.jsx'
import PlatformUsers from './pages/PlatformUsers.jsx'
import PlatformBackups from './pages/PlatformBackups.jsx'
import PlatformHistory from './pages/PlatformHistory.jsx'
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
          <Route path="board" element={<ServiceBoard />} />
          <Route path="board/:needId" element={<NeedDetail />} />
          <Route path="settings" element={<AccountSettings />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/messages" element={<AdminMessages />} />
          <Route path="admin/info" element={<AdminCommunityInfo />} />
          <Route path="admin/settings" element={<AdminSettings />} />
          <Route path="admin/board" element={<AdminServicePanel />} />
          <Route path="admin/residents" element={<AdminResidents />} />
        </Route>
        <Route path="/platform-admin" element={<PlatformAdminLayout />}>
          <Route index element={<PlatformMessages />} />
          <Route path="requests" element={<PlatformRequests />} />
          <Route path="neighborhoods" element={<PlatformNeighborhoods />} />
          <Route path="users" element={<PlatformUsers />} />
          <Route path="backups" element={<PlatformBackups />} />
          <Route path="history" element={<PlatformHistory />} />
        </Route>
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  )
}

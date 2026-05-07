import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';  // ← add Navigate
import Navbar                from './components/Navbar';
import ProtectedRoute        from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';  // ← add useAuth
import { PermissionsProvider, usePermissions } from './context/PermissionsContext';
import { PERMISSIONS } from './config/permissions';
import Home                  from './pages/Home';
import Form                  from './pages/Form';
import Images                from './pages/Images';
import ThankYou              from './pages/ThankYou';
import Login                 from './pages/Login';
import Register              from './pages/Register';
import Questions             from './pages/admin/Questions';
import QuestionForm          from './pages/admin/QuestionForm';
import SubmissionList        from './pages/submissions/SubmissionList';
import SubmissionDetail      from './pages/submissions/SubmissionDetail';
import Permissions           from './pages/admin/Permissions';
import Users                 from './pages/admin/Users';
import './style.css';
import Locations             from './pages/Locations';
import AdminLocations        from './pages/admin/Locations';
import AdminLocationEdit     from './pages/admin/LocationEdit';

// Guard: global_admin-only pages
function AdminOnly({ children }) {
  const { isGlobalAdmin } = useAuth();
  return isGlobalAdmin ? children : <Navigate to="/categories" replace />;
}

// Guard: permission-gated pages
function RequirePermission({ permission, children }) {
  const { isGlobalAdmin } = useAuth();
  const { hasPermission, loading } = usePermissions();
  if (isGlobalAdmin) return children;
  if (loading) return <p style={{ padding: '2rem', color: '#6b7280' }}>Loading…</p>;
  return hasPermission(permission)
    ? children
    : <Navigate to="/categories" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
      <BrowserRouter>
        <Navbar />
        <div className="container">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* "/" → only global_admin sees location picker, others go to /categories */}
            <Route path="/" element={
              <ProtectedRoute>
                <AdminOnly>
                  <Locations />
                </AdminOnly>
              </ProtectedRoute>
            } />

            {/* ← New: non-admin users land here directly after login */}
            <Route path="/categories" element={<ProtectedRoute><Home /></ProtectedRoute>} />

            {/* Admin picks a location → category page with locationSlug in URL */}
            <Route path="/location/:locationSlug" element={<ProtectedRoute><Home /></ProtectedRoute>} />

            <Route path="/form/:slug"                    element={<ProtectedRoute><Form /></ProtectedRoute>} />
            <Route path="/form/:slug/images"             element={<ProtectedRoute><Images /></ProtectedRoute>} />
            <Route path="/submissions/:uuid/thankyou"    element={<ProtectedRoute><ThankYou /></ProtectedRoute>} />
            <Route path="/submissions"                   element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.VIEW_SUBMISSIONS}><SubmissionList /></RequirePermission></ProtectedRoute>} />
            <Route path="/submissions/:uuid"             element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.VIEW_SUBMISSIONS}><SubmissionDetail /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/questions"               element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.MANAGE_QUESTIONS}><Questions /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/questions/new"           element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.MANAGE_QUESTIONS}><QuestionForm /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/questions/:id/edit"      element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.MANAGE_QUESTIONS}><QuestionForm /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/locations"               element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.MANAGE_LOCATIONS}><AdminLocations /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/locations/new"           element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.MANAGE_LOCATIONS}><AdminLocationEdit /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/locations/:id/edit"      element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.MANAGE_LOCATIONS}><AdminLocationEdit /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/users"                  element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.REGISTER_USER}><Users /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/register"                element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.REGISTER_USER}><Register /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/permissions"             element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.MANAGE_PERMISSIONS}><Permissions /></RequirePermission></ProtectedRoute>} />
          </Routes>
        </div>
      </BrowserRouter>
      </PermissionsProvider>
    </AuthProvider>
  );
}
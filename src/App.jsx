import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar               from './components/Sidebar';
import ProtectedRoute        from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';  // ← add useAuth
import { PermissionsProvider, usePermissions } from './context/PermissionsContext';
import { NotificationProvider } from './context/NotificationContext';
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
import CalendarPage          from './pages/Calendar';

// Guard: global_admin-only pages
function AdminOnly({ children }) {
  const { isGlobalAdmin } = useAuth();
  return isGlobalAdmin ? children : <Navigate to="/categories" replace />;
}

// Guard: permission-gated pages
function RequirePermission({ permission, allowRoles = [], children }) {
  const { isGlobalAdmin, role } = useAuth();
  const { hasPermission, loading } = usePermissions();
  if (isGlobalAdmin || allowRoles.includes(role)) return children;
  if (loading) return <p style={{ padding: '2rem', color: '#6b7280' }}>Loading…</p>;
  return hasPermission(permission)
    ? children
    : <Navigate to="/categories" replace />;
}

// Guard: calendar access for admins, inspectors, coordinators, attendees
function RequireCalendarAccess({ children }) {
  const { isGlobalAdmin, role, isScheduleAttendee } = useAuth();
  const { hasPermission, loading } = usePermissions();
  if (loading) return <p style={{ padding: '2rem', color: '#6b7280' }}>Loading…</p>;
  const canAccess =
    isGlobalAdmin ||
    role === 'local_admin' ||
    role === 'inspector' ||
    role === 'coordinator' ||
    hasPermission(PERMISSIONS.VIEW_SCHEDULES) ||
    isScheduleAttendee;
  return canAccess ? children : <Navigate to="/categories" replace />;
}

function AppLayout() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="app-layout">
      <Sidebar />
      <div className={`main-content${isAuthenticated ? '' : ' full-width'}`}>
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
            <Route path="/submissions/:uuid"             element={<ProtectedRoute><SubmissionDetail /></ProtectedRoute>} />
            {/* Calendar — inspectors, coordinators, attendees, admins */}
            <Route path="/calendar" element={
              <ProtectedRoute>
                <RequireCalendarAccess>
                  <CalendarPage />
                </RequireCalendarAccess>
              </ProtectedRoute>
            } />
            <Route path="/admin/questions"               element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.MANAGE_QUESTIONS} allowRoles={['local_admin']}><Questions /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/questions/new"           element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.MANAGE_QUESTIONS} allowRoles={['local_admin']}><QuestionForm /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/questions/:id/edit"      element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.MANAGE_QUESTIONS} allowRoles={['local_admin']}><QuestionForm /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/locations"               element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.MANAGE_LOCATIONS}><AdminLocations /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/locations/new"           element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.MANAGE_LOCATIONS}><AdminLocationEdit /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/locations/:id/edit"      element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.MANAGE_LOCATIONS}><AdminLocationEdit /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/users"                  element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.REGISTER_USER} allowRoles={['local_admin']}><Users /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/register"                element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.REGISTER_USER}><Register /></RequirePermission></ProtectedRoute>} />
            <Route path="/admin/permissions"             element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.MANAGE_PERMISSIONS}><Permissions /></RequirePermission></ProtectedRoute>} />
            <Route path="/calendar"                      element={<ProtectedRoute><RequirePermission permission={PERMISSIONS.VIEW_SCHEDULES}><CalendarPage /></RequirePermission></ProtectedRoute>} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <PermissionsProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </PermissionsProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
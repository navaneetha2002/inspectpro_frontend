import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar                from './components/Navbar';
import ProtectedRoute        from './components/ProtectedRoute';
import { AuthProvider }      from './context/AuthContext';
import { PermissionsProvider } from './context/PermissionsContext';
import { PERMISSIONS }       from './config/permissions';
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
import './style.css';
import Locations             from './pages/Locations';
import AdminLocations        from './pages/admin/Locations';
import AdminLocationEdit     from './pages/admin/LocationEdit';

export default function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <BrowserRouter>
          <Navbar />
          <div className="container">
            <Routes>
              {/* Public routes */}
              <Route path="/login"                         element={<Login />} />

              {/* Protected — no specific permission required (any authenticated user) */}
              <Route path="/"                              element={<ProtectedRoute><Locations /></ProtectedRoute>} />
              <Route path="/location/:locationSlug"        element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/form/:slug"                    element={<ProtectedRoute><Form /></ProtectedRoute>} />
              <Route path="/form/:slug/images"             element={<ProtectedRoute><Images /></ProtectedRoute>} />
              <Route path="/submissions/:uuid/thankyou"    element={<ProtectedRoute><ThankYou /></ProtectedRoute>} />

              {/* Permission-gated routes */}
              <Route path="/submissions"                   element={<ProtectedRoute permission={PERMISSIONS.VIEW_SUBMISSIONS}><SubmissionList /></ProtectedRoute>} />
              <Route path="/submissions/:uuid"             element={<ProtectedRoute permission={PERMISSIONS.VIEW_SUBMISSIONS}><SubmissionDetail /></ProtectedRoute>} />
              <Route path="/admin/questions"               element={<ProtectedRoute permission={PERMISSIONS.ADMIN_QUESTIONS}><Questions /></ProtectedRoute>} />
              <Route path="/admin/questions/new"           element={<ProtectedRoute permission={PERMISSIONS.ADMIN_QUESTIONS}><QuestionForm /></ProtectedRoute>} />
              <Route path="/admin/questions/:id/edit"      element={<ProtectedRoute permission={PERMISSIONS.ADMIN_QUESTIONS}><QuestionForm /></ProtectedRoute>} />
              <Route path="/admin/locations"               element={<ProtectedRoute permission={PERMISSIONS.ADMIN_LOCATIONS}><AdminLocations /></ProtectedRoute>} />
              <Route path="/admin/locations/new"           element={<ProtectedRoute permission={PERMISSIONS.ADMIN_LOCATIONS}><AdminLocationEdit /></ProtectedRoute>} />
              <Route path="/admin/locations/:id/edit"      element={<ProtectedRoute permission={PERMISSIONS.ADMIN_LOCATIONS}><AdminLocationEdit /></ProtectedRoute>} />
              <Route path="/admin/register"                element={<ProtectedRoute permission={PERMISSIONS.REGISTER_USER}><Register /></ProtectedRoute>} />
              <Route path="/admin/permissions"             element={<ProtectedRoute permission={PERMISSIONS.MANAGE_PERMISSIONS}><Permissions /></ProtectedRoute>} />
            </Routes>
          </div>
        </BrowserRouter>
      </PermissionsProvider>
    </AuthProvider>
  );
}

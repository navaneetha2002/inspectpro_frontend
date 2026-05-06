import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar           from './components/Navbar';
import ProtectedRoute   from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Home             from './pages/Home';
import Form             from './pages/Form';
import Images           from './pages/Images';
import ThankYou         from './pages/ThankYou';
import Login            from './pages/Login';
import Register         from './pages/Register';
import Questions        from './pages/admin/Questions';
import QuestionForm     from './pages/admin/QuestionForm';
import SubmissionList   from './pages/submissions/SubmissionList';
import SubmissionDetail from './pages/submissions/SubmissionDetail';
import './style.css';
import Locations        from './pages/Locations';
import AdminLocations   from './pages/admin/Locations';
import AdminLocationEdit from './pages/admin/LocationEdit';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <div className="container">
          <Routes>
            {/* Public routes */}
            <Route path="/login"                         element={<Login />} />
            <Route path="/register"                      element={<Register />} />
            <Route path="/form/:slug"                    element={<Form />} />
            <Route path="/form/:slug/images"             element={<Images />} />
            <Route path="/submissions/:uuid/thankyou"    element={<ThankYou />} />

            {/* Protected routes */}
            <Route path="/"                              element={<ProtectedRoute><Locations /></ProtectedRoute>} />
            <Route path="/location/:locationSlug"        element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/submissions"                   element={<ProtectedRoute><SubmissionList /></ProtectedRoute>} />
            <Route path="/submissions/:uuid"             element={<ProtectedRoute><SubmissionDetail /></ProtectedRoute>} />
            <Route path="/admin/questions"               element={<ProtectedRoute><Questions /></ProtectedRoute>} />
            <Route path="/admin/questions/new"           element={<ProtectedRoute><QuestionForm /></ProtectedRoute>} />
            <Route path="/admin/questions/:id/edit"      element={<ProtectedRoute><QuestionForm /></ProtectedRoute>} />
            <Route path="/admin/locations"               element={<ProtectedRoute><AdminLocations /></ProtectedRoute>} />
            <Route path="/admin/locations/new"           element={<ProtectedRoute><AdminLocationEdit /></ProtectedRoute>} />
            <Route path="/admin/locations/:id/edit"      element={<ProtectedRoute><AdminLocationEdit /></ProtectedRoute>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

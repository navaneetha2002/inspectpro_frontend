import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar          from './components/Navbar';
import Home            from './pages/Home';
import Form            from './pages/Form';
import Images          from './pages/Images';
import ThankYou        from './pages/ThankYou';
import Questions       from './pages/admin/Questions';
import QuestionForm    from './pages/admin/QuestionForm';
import SubmissionList  from './pages/submissions/SubmissionList';
import SubmissionDetail from './pages/submissions/SubmissionDetail';
import './style.css';
import Locations     from './pages/Locations';
import AdminLocations from './pages/admin/Locations';
import AdminLocationEdit from './pages/admin/LocationEdit';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      
        <Routes>
          <Route path="/form/:slug"                element={<Form />} />
          <Route path="/form/:slug/images"         element={<Images />} />
          <Route path="/submissions/:uuid/thankyou" element={<ThankYou />} />
          <Route path="/admin/questions"           element={<Questions />} />
          <Route path="/admin/questions/new"       element={<QuestionForm />} />
          <Route path="/admin/questions/:id/edit"  element={<QuestionForm />} />
          <Route path="/submissions"               element={<SubmissionList />} />
          <Route path="/submissions/:uuid"         element={<SubmissionDetail />} />
          <Route path="/"                              element={<Locations />} />
          <Route path="/location/:locationSlug"        element={<Home />} />
          <Route path="/admin/locations"               element={<AdminLocations />} />
          <Route path="/admin/locations/new"           element={<AdminLocationEdit />} />
          <Route path="/admin/locations/:id/edit"      element={<AdminLocationEdit />} />
        </Routes>
      
    </BrowserRouter>
  );
}
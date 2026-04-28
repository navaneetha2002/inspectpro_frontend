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

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/"                          element={<Home />} />
          <Route path="/form/:slug"                element={<Form />} />
          <Route path="/form/:slug/images"         element={<Images />} />
          <Route path="/submissions/:uuid/thankyou" element={<ThankYou />} />
          <Route path="/admin/questions"           element={<Questions />} />
          <Route path="/admin/questions/new"       element={<QuestionForm />} />
          <Route path="/admin/questions/:id/edit"  element={<QuestionForm />} />
          <Route path="/submissions"               element={<SubmissionList />} />
          <Route path="/submissions/:uuid"         element={<SubmissionDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
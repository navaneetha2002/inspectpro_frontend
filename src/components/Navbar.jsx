import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">InspectPro</Link>
      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/submissions">Submissions</Link>
        <Link to="/admin/questions">Admin</Link>
      </div>
    </nav>
  );
}
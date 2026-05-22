import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, clearToken, location_slug } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  if (!user) {
    return <p style={{ padding: '2rem' }}>No profile data available.</p>;
  }

  const fields = [
    { label: 'Username',  value: user.username },
    { label: 'Email',     value: user.email },
    { label: 'Role',      value: user.role },
    { label: 'Location', value: user.location || user.location_name || location_slug }
  ].filter(f => f.value !== undefined && f.value !== null && f.value !== '');

  const initials = (user.username || user.email || '?')
    .slice(0, 2)
    .toUpperCase();

    console.log("PROFILE USER =", user);

  return (
    <div className="profile-wrapper">
      <div className="profile-card">
        <div className="profile-avatar">{initials}</div>
        <h2 className="profile-name">{user.username || user.email}</h2>
        {user.role && <span className="profile-role-badge">{user.role}</span>}

        <dl className="profile-details">
          {fields.map(({ label, value }) => (
            <div className="profile-row" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <button className="btn btn-danger" style={{ marginTop: '1.5rem', width: '100%' }} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}


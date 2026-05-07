import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, getLocationById } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const { saveToken, saveLocationSlug } = useAuth();  // ← single declaration
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res   = await login(username, password);
      const token = res.data.token;
      saveToken(token);

      const payload     = JSON.parse(atob(token.split('.')[1]));
      const role        = payload.role || payload.roles;
      const location_id = payload.location_id;

      if (role === 'global_admin') {
        navigate('/', { replace: true });
      } else {
        const locRes = await getLocationById(location_id);
        const slug   = locRes.data.slug;
        saveLocationSlug(slug);                            // ← persist slug
        navigate(`/location/${slug}`, { replace: true });
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Sign In</h2>
        {error && <p className="login-error">{error}</p>}
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
        <p className="auth-switch">
          New user? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
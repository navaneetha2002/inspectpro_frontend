import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const { saveToken } = useAuth();
  const navigate      = useNavigate();
  const location      = useLocation();
  const from          = location.state?.from?.pathname || '/';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(username, password);
      const token = res.data.token;
      saveToken(token);
      navigate(from, { replace: true });
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

      </form>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { register, getRolesWithPerms } from '../api/api';

export default function Register() {
  const [username, setUsername]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [location, setLocation]   = useState('');
  const [role, setRole]           = useState('');
  const [roles, setRoles]         = useState([]);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    getRolesWithPerms()
      .then(res => setRoles(Array.isArray(res.data) ? res.data : []))
      .catch(err => setError('Failed to load roles: ' + (err.response?.data?.message || err.message)));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password, location, role);
      setSuccess('Account created successfully.');
      setUsername(''); setEmail(''); setPassword('');
      setConfirm(''); setLocation(''); setRole('');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center py-5">
      <div className="login-card">
        <h2 className="h4 fw-bold text-center mb-3">Register New User</h2>

        {error   && <div className="alert alert-danger py-2">{error}</div>}
        {success && <div className="alert alert-success py-2">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Username</label>
            <input type="text" className="form-control" value={username}
              onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Email</label>
            <input type="email" className="form-control" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Location</label>
            <input type="text" className="form-control" value={location}
              onChange={(e) => setLocation(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Role</label>
            <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)} required>
              <option value="">Select a role</option>
              {roles.map(r => (
                <option key={r.role} value={r.role}>{r.role}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Password</label>
            <input type="password" className="form-control" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Confirm Password</label>
            <input type="password" className="form-control" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Creating account…' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}


import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import lottie from 'lottie-web';
import { login, getLocationById } from '../api/api';
import { useAuth } from '../context/AuthContext';
import loginAnimationData from '../assets/loginAnimation.json';

function LottiePlayer({ animationData, className }) {
  const containerRef = useRef(null);
  useEffect(() => {
    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData,
    });
    return () => anim.destroy();
  }, [animationData]);
  return <div ref={containerRef} className={className} />;
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const { saveToken, saveLocationSlug } = useAuth();
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
        saveLocationSlug(slug);
        navigate(`/location/${slug}`, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-split">
      {/* Left panel — animation */}
      <div className="login-left">
        <div className="login-left-content">
          <LottiePlayer animationData={loginAnimationData} className="login-lottie" />
          <h1 className="login-brand">InspectPro</h1>
          <p className="login-tagline">Streamline your workplace inspections</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="login-right">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2 className="h4 fw-bold text-center mb-1">Sign In</h2>
          <p className="text-center text-muted small mb-3">Welcome back! Please enter your credentials.</p>

          {error && <div className="alert alert-danger py-2">{error}</div>}

          <div className="mb-3">
            <label className="form-label fw-semibold">Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-100 mt-2" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}


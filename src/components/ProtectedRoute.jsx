import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, token, logout } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || isTokenExpired(token)) {
    if (isAuthenticated) logout(); // clear stale state if token expired silently
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}


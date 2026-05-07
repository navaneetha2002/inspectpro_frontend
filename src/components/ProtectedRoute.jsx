import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';

export default function ProtectedRoute({ children, permission }) {
  const { isAuthenticated, role } = useAuth();
  const { hasPermission } = usePermissions();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !hasPermission(role, permission)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

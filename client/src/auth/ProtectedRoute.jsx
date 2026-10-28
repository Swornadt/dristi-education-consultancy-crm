import { Spin } from 'antd';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Wrap a route element. Without `module` it only requires a signed-in user;
// with `module` (and optional `action`, default "view") it also checks the permission.
export default function ProtectedRoute({ children, module, action = 'view' }) {
  const { user, loading, can } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (module && !can(module, action)) return <Navigate to="/forbidden" replace />;
  return children;
}

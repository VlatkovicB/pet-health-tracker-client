import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && user.role !== 'admin') return <Navigate to="/" replace />;
  // user is null while loading on first mount — render children optimistically
  return <>{children}</>;
}

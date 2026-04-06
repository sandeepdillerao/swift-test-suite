import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useLoadPermissions } from '@/hooks/usePermissions';

export const ProtectedRoute = () => {
  const { isAuthenticated, accessToken } = useAuthStore();
  const location = useLocation();

  // Load user's permissions into the global store on mount
  useLoadPermissions();

  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

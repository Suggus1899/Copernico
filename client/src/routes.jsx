import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/authContext";

export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <h1>Loading...</h1>;
  if (!isAuthenticated && !loading) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export const RoleProtectedRoute = ({ roles }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <h1>Loading...</h1>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Treat missing role as 'student' (backwards-compatible default)
  const userRole = user?.role || "student";
  if (!roles.includes(userRole)) return <Navigate to="/tasks" replace />;
  return <Outlet />;
};

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const token = localStorage.getItem('token'); // Get token from localStorage

  if (!token) {
    return <Navigate to="/login" replace />; // Redirect to login if no token
  }

  // If token exists, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;

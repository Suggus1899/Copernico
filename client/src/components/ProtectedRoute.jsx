import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';

// La sesión vive en una cookie HttpOnly que el cliente no puede leer:
// se comprueba preguntando al servidor.
const ProtectedRoute = () => {
  const [status, setStatus] = useState('checking'); // checking | authenticated | anonymous | error

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get('/auth/profile')
      .then(() => {
        if (!cancelled) setStatus('authenticated');
      })
      .catch((error) => {
        if (!cancelled) setStatus(error.response?.status === 401 ? 'anonymous' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'checking') return <p role="status">Comprobando sesión…</p>;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  if (status === 'error') {
    return <p role="alert">No se pudo comprobar tu sesión. Recarga la página para intentarlo de nuevo.</p>;
  }
  return <Outlet />;
};

export default ProtectedRoute;

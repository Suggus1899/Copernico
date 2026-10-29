import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useOutletContext } from 'react-router-dom';
import type { User, UserRole } from '../types/auth';
import type { ApiResponse } from '../types/api';
import apiClient from '../utils/axiosConfig';

type Session =
  | { status: 'checking' }
  | { status: 'authenticated'; user: User }
  | { status: 'anonymous' }
  | { status: 'error' };

export const useSessionUser = () => useOutletContext<User>();

export const ProtectedRoute = () => {
  const [session, setSession] = useState<Session>({ status: 'checking' });

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<ApiResponse<User>>('/auth/profile')
      .then((response) => {
        if (!cancelled) setSession({ status: 'authenticated', user: response.data.data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSession({
          status: axios.isAxiosError(error) && error.response?.status === 401 ? 'anonymous' : 'error',
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (session.status === 'checking') return <p className="session-message" role="status">Comprobando sesión…</p>;
  if (session.status === 'anonymous') return <Navigate to="/login" replace />;
  if (session.status === 'error') {
    return <p className="session-message" role="alert">No se pudo comprobar tu sesión. Recarga la página para intentarlo de nuevo.</p>;
  }
  return <Outlet context={session.user} />;
};

export const RoleRoute = ({ roles }: { roles: UserRole[] }) => {
  const user = useSessionUser();
  if (roles.includes(user.role)) return <Outlet context={user} />;

  return (
    <section className="role-denied" role="status">
      <p className="eyebrow">ACCESO POR ROL</p>
      <h1>Esta vista no está disponible para tu cuenta</h1>
      <p>Vuelve a tu espacio de trabajo para continuar.</p>
      <Link className="btn btn-primary" to="/dashboard">Ir a mi inicio</Link>
    </section>
  );
};

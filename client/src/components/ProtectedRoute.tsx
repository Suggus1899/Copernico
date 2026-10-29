import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useOutletContext } from 'react-router-dom';
import type { User, UserRole } from '../types/auth';
import type { ApiResponse } from '../types/api';
import apiClient from '../utils/axiosConfig';
import {
  syncPendingVideoProgress,
  VIDEO_PROGRESS_SYNC_EVENT,
  type VideoProgressSyncResult,
} from '../utils/videoProgressQueue';

type Session =
  | { status: 'checking' }
  | { status: 'authenticated'; user: User }
  | { status: 'anonymous' }
  | { status: 'error' };

export const useSessionUser = () => useOutletContext<User>();

export const ProtectedRoute = () => {
  const [session, setSession] = useState<Session>({ status: 'checking' });
  const [progressNotice, setProgressNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    let userId = '';
    let retryTimer: number | undefined;

    const updateNotice = (result: VideoProgressSyncResult) => {
      if (cancelled) return;
      setProgressNotice(result.storageError
        ? 'No se pudo leer la cola local de progreso.'
        : result.expiredCount > 0
          ? `${result.expiredCount} intervalo(s) de reproducción no se pudo/pudieron recuperar porque venció el plazo de 24 horas.`
          : result.failedCount > 0
            ? 'Un envío de progreso no se pudo sincronizar y se descartó.'
            : result.hasPending
              ? 'Progreso guardado en este dispositivo; pendiente de sincronizar.'
              : '');

      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      if (result.hasPending && navigator.onLine) {
        retryTimer = window.setTimeout(() => void sync(), 30000);
      }
    };

    const sync = async () => {
      if (!userId) return;
      updateNotice(await syncPendingVideoProgress(userId));
    };

    const handleOnline = () => void sync();
    const handleProgressSync = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; result: VideoProgressSyncResult }>).detail;
      if (detail.userId === userId) updateNotice(detail.result);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener(VIDEO_PROGRESS_SYNC_EVENT, handleProgressSync);
    apiClient
      .get<ApiResponse<User>>('/auth/profile')
      .then((response) => {
        if (!cancelled) {
          userId = response.data.data._id;
          setSession({ status: 'authenticated', user: response.data.data });
          void sync();
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSession({
          status: axios.isAxiosError(error) && error.response?.status === 401 ? 'anonymous' : 'error',
        });
      });
    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener(VIDEO_PROGRESS_SYNC_EVENT, handleProgressSync);
    };
  }, []);

  if (session.status === 'checking') return <p className="session-message" role="status">Comprobando sesión…</p>;
  if (session.status === 'anonymous') return <Navigate to="/login" replace />;
  if (session.status === 'error') {
    return <p className="session-message" role="alert">No se pudo comprobar tu sesión. Recarga la página para intentarlo de nuevo.</p>;
  }
  return <>
    {progressNotice && <p className="session-message" role="status">{progressNotice}</p>}
    <Outlet context={session.user} />
  </>;
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

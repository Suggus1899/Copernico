import { useEffect, useState } from 'react';
import type { User } from '../types/auth';
import type { ApiResponse, Pagination } from '../types/api';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';
import './AdminHome.css';

const roleLabels: Record<User['role'], string> = { admin: 'Administrador', student: 'Estudiante', tutor: 'Tutor', advisor: 'Asesor' };
const statusLabels: Record<User['status'], string> = { active: 'Activa', inactive: 'Inactiva', suspended: 'Suspendida', deleted: 'Eliminada' };

export default function AdminHome() {
  const [users, setUsers] = useState<User[]>([]);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    apiClient.get<ApiResponse<User[]> & { pagination: Pagination }>('/users', {
      params: { page, limit: 20, ...(role && { role }), ...(status && { status }) }, signal: controller.signal,
    }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setUsers(data.data);
      setPagination(data.pagination);
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(getApiErrorMessage(failure, 'No se pudieron cargar las cuentas.'));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [page, role, status, reload]);

  return <section className="admin-home" aria-labelledby="admin-title">
    <header><p className="eyebrow">Administración</p><h1 id="admin-title">Cuentas de la comunidad</h1><p>Consulta las cuentas registradas y su estado.</p></header>
    <div className="admin-home__filters">
      <label>Rol<select value={role} onChange={event => { setRole(event.target.value); setPage(1); }}>
        <option value="">Todos los roles</option><option value="student">Estudiantes</option><option value="tutor">Tutores</option><option value="admin">Administradores</option>
      </select></label>
      <label>Estado<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
        <option value="">Todos los estados</option><option value="active">Activas</option><option value="inactive">Inactivas</option><option value="suspended">Suspendidas</option>
      </select></label>
      <button className="btn btn-outline" type="button" onClick={() => setReload(value => value + 1)} disabled={loading}>Actualizar</button>
    </div>
    {loading ? <p role="status">Cargando cuentas…</p> : error ? <p role="alert">{error} <button type="button" onClick={() => setReload(value => value + 1)}>Reintentar</button></p> : <>
      <p role="status">{pagination.total} cuenta(s) con los filtros seleccionados.</p>
      {users.length ? <div className="admin-home__table"><table><caption>Cuentas registradas</caption><thead><tr><th scope="col">Nombre</th><th scope="col">Correo</th><th scope="col">Rol</th><th scope="col">Estado</th></tr></thead><tbody>
        {users.map(user => <tr key={user._id}><td>{[user.personalInfo?.firstName, user.personalInfo?.lastName].filter(Boolean).join(' ') || 'Sin nombre'}</td><td>{user.email}</td><td>{roleLabels[user.role]}</td><td>{statusLabels[user.status]}</td></tr>)}
      </tbody></table></div> : <p>No hay cuentas con estos filtros.</p>}
      <nav className="admin-home__pagination" aria-label="Páginas de cuentas">
        <button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
        <span>Página {page} de {Math.max(1, pagination.pages)}</span>
        <button type="button" className="btn btn-outline" disabled={page >= pagination.pages} onClick={() => setPage(value => value + 1)}>Siguiente</button>
      </nav>
    </>}
  </section>;
}

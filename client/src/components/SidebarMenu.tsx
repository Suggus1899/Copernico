import type { KeyboardEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Pagination } from '../types/api';
import type { UserRole } from '../types/auth';
import apiClient from '../utils/axiosConfig';
import usePolling from '../utils/usePolling';
import logo from '../assets/logo.jpg';
import iconCursos from '../assets/course.png';
import iconVideos from '../assets/videos.png';
import iconTutores from '../assets/tutors.png';
import iconAsesoria from '../assets/asesorias.png';
import iconNotas from '../assets/notas.png';
import iconPerfil from '../assets/profile.png';
import iconConfig from '../assets/settings.png';
import iconLogout from '../assets/logout.png';
import './SidebarMenu.css';

type MenuItem = { path: string; icon: string; label: string; badge?: number };

const studentItems: MenuItem[] = [
  { path: '/dashboard', icon: iconPerfil, label: 'Inicio' },
  { path: '/dashboard/cursos', icon: iconCursos, label: 'Mis tutorías' },
  { path: '/dashboard/videos', icon: iconVideos, label: 'Mi aprendizaje' },
  { path: '/dashboard/progreso-videos', icon: iconConfig, label: 'Mi progreso' },
  { path: '/dashboard/tutores', icon: iconTutores, label: 'Encontrar tutor' },
  { path: '/dashboard/notas', icon: iconNotas, label: 'Mis notas' },
  { path: '/dashboard/mensajes', icon: iconAsesoria, label: 'Mensajes' },
];

const tutorItems: MenuItem[] = [
  { path: '/dashboard', icon: iconPerfil, label: 'Inicio' },
  { path: '/dashboard/agenda', icon: iconAsesoria, label: 'Agenda' },
  { path: '/dashboard/cursos-tutor', icon: iconCursos, label: 'Mis cursos' },
  { path: '/dashboard/estudiantes', icon: iconTutores, label: 'Mis estudiantes' },
  { path: '/dashboard/videos-tutor', icon: iconVideos, label: 'Videos de clases' },
  { path: '/dashboard/progreso', icon: iconConfig, label: 'Progreso' },
  { path: '/dashboard/notificaciones', icon: iconAsesoria, label: 'Notificaciones' },
  { path: '/dashboard/mensajes-tutor', icon: iconNotas, label: 'Mensajes' },
];

const profilePath = (role: UserRole) => role === 'tutor' || role === 'advisor' ? '/dashboard/perfil-tutor' : '/dashboard/perfil';

const SidebarMenu = ({
  userRole = 'student',
  userName = 'Mi cuenta',
  open = false,
  onClose = () => {},
}: {
  userRole?: UserRole;
  userName?: string;
  open?: boolean;
  onClose?: () => void;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const isTutor = userRole === 'tutor' || userRole === 'advisor';
  const items = isTutor ? tutorItems : studentItems;
  const roleLabel = userRole === 'advisor' ? 'Asesor' : isTutor ? 'Tutor' : userRole === 'admin' ? 'Administrador' : 'Estudiante';
  const initials = userName.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  const fetchUnreadCount = useCallback(async () => {
    try {
      if (isTutor) {
        const response = await apiClient.get<{ success: boolean; data: { unreadCount: number } }>('/notifications/unread-count');
        setUnreadCount(response.data.data?.unreadCount ?? 0);
        return;
      }
      const response = await apiClient.get<{ success: boolean; pagination: Pagination }>('/notifications', {
        params: { type: 'message_received', read: false, limit: 1 },
      });
      setUnreadCount(response.data.pagination?.total ?? 0);
    } catch {
      // El contador es informativo: un fallo puntual no debe interrumpir la navegación.
    }
  }, [isTutor]);

  usePolling(fetchUnreadCount, 30000);

  useEffect(() => {
    window.addEventListener('messagesRead', fetchUnreadCount);
    return () => window.removeEventListener('messagesRead', fetchUnreadCount);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (location.pathname !== '/dashboard/mensajes' && location.pathname !== '/dashboard/mensajes-tutor') {
      fetchUnreadCount();
    }
  }, [location.pathname, fetchUnreadCount]);

  useEffect(() => {
    if (open) navRef.current?.querySelector<HTMLElement>('a[href], button:not(:disabled)')?.focus();
  }, [open]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/signout');
    } catch {
      // Si la sesión ya no es válida en el servidor, igualmente volvemos al login.
    }
    navigate('/login');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!open || event.key !== 'Tab') return;
    const focusable = Array.from(navRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') ?? []);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <nav id="primary-sidebar" ref={navRef} className={`sidebar-menu${open ? ' is-open' : ''}`} aria-label="Navegación principal" onKeyDown={handleKeyDown}>
      <div className="sidebar-menu__brand-row">
        <Link to="/dashboard" className="sidebar-logo-container" onClick={onClose} aria-label="Copérnico, inicio">
          <img src={logo} alt="" className="sidebar-logo" />
          <span>Copérnico</span>
        </Link>
        <button className="sidebar-menu__close" type="button" onClick={onClose} aria-label="Cerrar menú">×</button>
      </div>

      <p className="sidebar-menu__section-label">MI ESPACIO</p>
      <ul className="menu-list">
        {items.map((item) => {
          const active = item.path === '/dashboard'
            ? location.pathname === item.path || location.pathname === `${item.path}/`
            : location.pathname === item.path;
          const count = item.label === 'Mensajes' && !isTutor ? unreadCount : item.label === 'Notificaciones' && isTutor ? unreadCount : 0;
          return (
            <li key={item.path}>
              <Link to={item.path} onClick={onClose} className={`menu-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
                <img src={item.icon} alt="" className="menu-icon-img" />
                <span className="menu-label">{item.label}</span>
                {count > 0 && <span className="notification-badge" aria-label={`${count} sin leer`}>{count > 9 && !isTutor ? '9+' : count > 99 ? '99+' : count}</span>}
              </Link>
            </li>
          );
        })}
        <li className="menu-list__logout">
          <button type="button" className="menu-link logout" onClick={handleLogout}>
            <img src={iconLogout} alt="" className="menu-icon-img" />
            <span className="menu-label">Salir</span>
          </button>
        </li>
      </ul>

      <div className="sidebar-menu__bottom">
        <p className="sidebar-menu__quote">El conocimiento<br />nos mueve.</p>
        <Link to={profilePath(userRole)} className="sidebar-user" onClick={onClose}>
          <span className="sidebar-user__initials" aria-hidden="true">{initials || 'C'}</span>
          <span className="sidebar-user__copy"><strong>{userName}</strong><small>{roleLabel}</small></span>
          <span className="sidebar-user__arrow" aria-hidden="true">›</span>
        </Link>
      </div>
    </nav>
  );
};

export default SidebarMenu;

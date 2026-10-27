import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import usePolling from '../utils/usePolling';
import './SidebarMenu.css';

// Importación de activos (Asegúrate de que los nombres de archivo sean correctos)
import logo from '../assets/logo.jpg';
import iconCursos from '../assets/course.png';
import iconVideos from '../assets/videos.png';
import iconTutores from '../assets/tutors.png';
import iconAsesoria from '../assets/asesorias.png';
import iconNotas from '../assets/notas.png';
import iconPerfil from '../assets/profile.png';
import iconLogout from '../assets/logout.png';


const SidebarMenu = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const fetchUnreadMessagesCount = useCallback(async () => {
    try {
      // Solo necesitamos el total: limit 1 evita descargar notificaciones.
      const response = await apiClient.get('/notifications', {
        params: { type: 'message_received', read: false, limit: 1 },
      });
      setUnreadMessagesCount(response.data?.pagination?.total ?? 0);
    } catch {
      // El contador es informativo: un fallo puntual no debe interrumpir la navegación.
    }
  }, []);

  usePolling(fetchUnreadMessagesCount, 30000);

  // Mensajes leídos en otra parte de la app: refrescar el contador al instante.
  useEffect(() => {
    window.addEventListener('messagesRead', fetchUnreadMessagesCount);
    return () => window.removeEventListener('messagesRead', fetchUnreadMessagesCount);
  }, [fetchUnreadMessagesCount]);

  // Al salir de Mensajes el contador puede haber cambiado.
  useEffect(() => {
    if (location.pathname !== '/dashboard/mensajes') {
      fetchUnreadMessagesCount();
    }
  }, [location.pathname, fetchUnreadMessagesCount]);

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/auth/signout');
    } catch {
      // Si la sesión ya no es válida en el servidor, igualmente volvemos al login.
    }
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard/cursos', icon: iconCursos, label: 'Cursos' },
    { path: '/dashboard/videos', icon: iconVideos, label: 'Clases' },
    { path: '/dashboard/progreso-videos', icon: iconVideos, label: 'Mi Progreso' },
    { path: '/dashboard/tutores', icon: iconTutores, label: 'Tutores' },
    { path: '/dashboard/notas', icon: iconNotas, label: 'Apuntes' },
    { path: '/dashboard/mensajes', icon: iconAsesoria, label: 'Mensajes' },
    { path: '/dashboard/perfil', icon: iconPerfil, label: 'Perfil' },
    { path: '#', icon: iconLogout, label: 'Salir', isLogout: true }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sidebar-menu">
      {/* El logo ahora es parte integral del flujo, sin cajas oscuras */}
      <Link to="/dashboard" className="sidebar-logo-container">
        <img src={logo} alt="Copernico Logo" className="sidebar-logo" />
        <div className="logo-separator"></div>
      </Link>
      
      <ul className="menu-list">
        {menuItems.map((item) => (
          <li key={item.label}>
            <Link
              to={item.path}
              onClick={item.isLogout ? handleLogout : null}
              className={`menu-link ${isActive(item.path) ? 'active' : ''} ${item.isLogout ? 'logout' : ''}`}
            >
              <img src={item.icon} alt={item.label} className="menu-icon-img" />
              <span className="menu-label">{item.label}</span>
              {item.label === 'Mensajes' && unreadMessagesCount > 0 && (
                <span className="notification-badge">{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SidebarMenu;
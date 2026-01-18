import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpg';
import './SidebarMenu.css';
import apiClient from '../utils/axiosConfig';

const TutorSidebarMenu = ({ userRole = 'tutor' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const isAdvisor = userRole === 'advisor';
  const roleTitle = isAdvisor ? 'Panel de Asesor' : 'Panel de Tutor';
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiClient.get('/notifications/unread-count');
        if (mounted) setUnreadCount(res?.data?.data?.count || 0);
      } catch (e) {
        // silencioso
      }
    })();
    return () => { mounted = false; };
  }, []);

  const menuItems = [
    { path: '/dashboard', icon: '🏠', label: 'Dashboard', exact: true },
    { path: '/dashboard/cursos-tutor', icon: '📚', label: isAdvisor ? 'Mis Asesorías' : 'Mis Cursos/Grupos' },
    { path: '/dashboard/estudiantes', icon: '👨‍🎓', label: 'Mis Estudiantes' },
    { path: '/dashboard/agenda', icon: '📅', label: isAdvisor ? 'Agenda de Asesorías' : 'Agenda de Clases' },
    { path: '/dashboard/materiales', icon: '📄', label: 'Gestión de Materiales' },
    { path: '/dashboard/progreso', icon: '📊', label: 'Progreso Estudiantes' },
    { path: '/dashboard/notificaciones', icon: '🔔', label: `Notificaciones${unreadCount ? ` (${unreadCount})` : ''}` },
    { path: '/dashboard/perfil-tutor', icon: '👤', label: isAdvisor ? 'Mi Perfil de Asesor' : 'Mi Perfil de Tutor' }
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="sidebar-menu">
      <div className="sidebar-header">
        <div className="sidebar-header-content">
          <img src={logo} alt="Copernico Academy Logo" className="sidebar-logo" />
          <h3 className="sidebar-title">{roleTitle}</h3>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul className="menu-list">
          {menuItems.map((item) => (
            <li key={item.path} className="menu-item">
              <Link
                to={item.path}
                className={`menu-link ${isActive(item.path, item.exact) ? 'active' : ''}`}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="tutor-status">
          <div className="status-indicator online"></div>
          <span className="status-text">En línea</span>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <span className="menu-icon">🚪</span>
          <span className="menu-label">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default TutorSidebarMenu;

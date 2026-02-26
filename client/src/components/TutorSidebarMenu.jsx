import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import logo from '../assets/logo.jpg';
import './SidebarMenu.css';

// Importar iconos (usando los mismos del estudiante donde sea posible)
import iconCursos from '../assets/course.png';
import iconVideos from '../assets/videos.png';
import iconTutores from '../assets/tutors.png';
import iconAsesoria from '../assets/asesorias.png';
import iconNotas from '../assets/notas.png';
import iconPerfil from '../assets/profile.png';
import iconConfig from '../assets/settings.png';
import iconLogout from '../assets/logout.png';

const TutorSidebarMenu = ({ userRole = 'tutor' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    
    // Actualizar contador cada 30 segundos
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      console.log('📊 Fetching unread count for role:', userRole);
      const response = await apiClient.get('/notifications/unread-count');
      const count = response.data.data?.unreadCount || 0;
      console.log('📊 Unread count received:', count);
      setUnreadCount(count);
    } catch (error) {
      console.error('📊 Error fetching unread count:', error);
    }
  };

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    navigate('/login');
  };

  const isAdvisor = userRole === 'advisor';

  const menuItems = [
    { path: '/dashboard/cursos-tutor', icon: iconCursos, label: 'Mis Cursos' },
    { path: '/dashboard/videos-tutor', icon: iconVideos, label: 'Videos de Clases' },
    { path: '/dashboard/estudiantes', icon: iconTutores, label: 'Mis Estudiantes' },
    { path: '/dashboard/agenda', icon: iconAsesoria, label: 'Agenda de Clases' },
    { path: '/dashboard/progreso', icon: iconConfig, label: 'Progreso' },
    { 
      path: '/dashboard/notificaciones', 
      icon: iconAsesoria, 
      label: 'Notificaciones',
      hasNotifications: unreadCount > 0,
      notificationCount: unreadCount
    },
    { path: '/dashboard/mensajes-tutor', icon: iconNotas, label: 'Mensajes' },
    { path: '/dashboard/perfil-tutor', icon: iconPerfil, label: 'Perfil' },
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
              {item.hasNotifications && (
                <span className="notification-badge">
                  {item.notificationCount > 99 ? '99+' : item.notificationCount}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default TutorSidebarMenu;

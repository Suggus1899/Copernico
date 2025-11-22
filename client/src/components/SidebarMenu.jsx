import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpg';
import './SidebarMenu.css';

const SidebarMenu = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const menuItems = [
    {
      path: '/dashboard',
      icon: '🏠',
      label: 'Inicio',
      exact: true
    },
    {
      path: '/dashboard/cursos',
      icon: '📚',
      label: 'Mis Cursos'
    },
    {
      path: '/dashboard/tutores',
      icon: '👨‍🏫',
      label: 'Tutores'
    },
    {
      path: '/dashboard/notas',
      icon: '📝',
      label: 'Mis Notas'
    },
    {
      path: '/dashboard/perfil',
      icon: '👤',
      label: 'Mi Perfil'
    },
    {
      path: '/dashboard/configuracion',
      icon: '⚙️',
      label: 'Configuración'
    }
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
          <h3 className="sidebar-title">Menú</h3>
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
        <button onClick={handleLogout} className="logout-btn">
          <span className="menu-icon">🚪</span>
          <span className="menu-label">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default SidebarMenu;


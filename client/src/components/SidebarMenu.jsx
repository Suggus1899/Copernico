import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard/cursos', icon: iconCursos, label: 'Cursos' },
    { path: '/dashboard/videos', icon: iconVideos, label: 'Clases' },
    { path: '/dashboard/tutores', icon: iconTutores, label: 'Tutores' },
    { path: '/dashboard/asesoria', icon: iconAsesoria, label: 'Asesoría' },
    { path: '/dashboard/notas', icon: iconNotas, label: 'Apuntes' },
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
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SidebarMenu;
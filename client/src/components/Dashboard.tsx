import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import type { User } from '../types/auth';
import { useSessionUser } from './ProtectedRoute';
import SidebarMenu from './SidebarMenu';
import { ThemeToggle } from './Theme';
import './Dashboard.css';
import '../tutor-pages.css';

const getDisplayName = (user: User) => {
  const name = [user.personalInfo?.firstName, user.personalInfo?.lastName].filter(Boolean).join(' ').trim();
  return name || user.email;
};

const getPageLabel = (pathname: string) => {
  if (pathname === '/dashboard' || pathname === '/dashboard/') return 'Inicio';
  if (pathname.includes('mensajes')) return 'Mensajes';
  if (pathname.includes('perfil')) return 'Perfil';
  if (pathname.includes('cursos')) return 'Mis cursos';
  if (pathname.includes('videos')) return 'Clases';
  if (pathname.includes('tutores')) return 'Encontrar tutor';
  if (pathname.includes('estudiantes')) return 'Mis estudiantes';
  if (pathname.includes('agenda')) return 'Agenda';
  if (pathname.includes('notas')) return 'Mis notas';
  if (pathname.includes('progreso')) return 'Progreso';
  if (pathname.includes('notificaciones')) return 'Notificaciones';
  return 'Mi espacio';
};

const Dashboard = () => {
  const user = useSessionUser();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const displayName = getDisplayName(user);
  const initials = displayName.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const profilePath = user.role === 'tutor' || user.role === 'advisor' ? '/dashboard/perfil-tutor' : '/dashboard/perfil';
  const closeMenu = () => {
    setMobileMenuOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  useEffect(() => {
    setMobileMenuOpen(false);
    requestAnimationFrame(() => document.getElementById('main-content')?.focus());
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closeMenu();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  return (
    <div className="dashboard-shell">
      {mobileMenuOpen && (
        <button className="dashboard-backdrop" type="button" onClick={closeMenu} aria-label="Cerrar menú" />
      )}
      <SidebarMenu
        userRole={user.role}
        userName={displayName}
        open={mobileMenuOpen}
        onClose={closeMenu}
      />
      <div className="dashboard-content">
        <header className="dashboard-topbar">
          <button
            ref={menuButtonRef}
            className="dashboard-menu-toggle"
            type="button"
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-controls="primary-sidebar"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">☰</span>
          </button>
          <div className="dashboard-breadcrumb"><span>Mi espacio</span><span aria-hidden="true">›</span><strong>{getPageLabel(location.pathname)}</strong></div>
          <div className="dashboard-topbar__actions">
            <ThemeToggle />
            <time dateTime={new Date().toISOString()}>{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}</time>
            <Link className="dashboard-user-initials" to={profilePath} aria-label={`Ver perfil de ${displayName}`}>{initials || 'C'}</Link>
          </div>
        </header>
        <main id="main-content" className="dashboard-main" tabIndex={-1}>
          <Outlet context={user} />
        </main>
        <footer className="dashboard-footer"><span>Copérnico · El conocimiento nos mueve.</span></footer>
      </div>
    </div>
  );
};

export default Dashboard;

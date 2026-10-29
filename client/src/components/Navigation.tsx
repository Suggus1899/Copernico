import type { KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/logo.jpg';
import './Navigation.css';

export const Navigation = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open]);

  const trapMenuFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open || event.key !== 'Tab') return;
    const focusable = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') ?? []);
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

  const closeMenu = () => setOpen(false);

  return (
    <nav className="navbar-copernico" aria-label="Navegación del sitio">
      <div className="nav-container">
        <Link className="navbar-brand-copernico" to="/" onClick={closeMenu} aria-label="Copérnico, inicio">
          <img src={logo} alt="" className="navbar-logo" />
          <span className="navbar-brand-text">Copérnico</span>
        </Link>

        <button
          ref={toggleRef}
          className="navbar-toggler-custom"
          type="button"
          aria-controls="public-navigation"
          aria-expanded={open}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden="true">{open ? '×' : '☰'}</span>
        </button>

        {open && <button className="navbar-backdrop" type="button" onClick={closeMenu} aria-label="Cerrar menú" />}
        <div ref={menuRef} id="public-navigation" className={`navbar-menu${open ? ' is-open' : ''}`} onKeyDown={trapMenuFocus}>
          <div className="navbar-nav-copernico">
            <Link className={`nav-link-copernico${location.pathname === '/' || location.pathname === '/home' ? ' active' : ''}`} to="/" onClick={closeMenu}>
              Inicio
            </Link>
          </div>
          <div className="navbar-actions">
            <Link to="/login" className="btn-nav-login" onClick={closeMenu}>Acceder</Link>
            <Link to="/signup" className="btn-nav-signup" onClick={closeMenu}>Crear cuenta</Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.jpg";
import "./Navigation.css";

export const Navigation = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/" || location.pathname === "/home";

  return (
    <nav className={`navbar-copernico ${isHomePage ? 'navbar-transparent' : 'navbar-solid'}`}>
      <div className="container">
        <Link className="navbar-brand-copernico" to="/">
          <img src={logo} alt="Copernico Academy Logo" className="navbar-logo" />
          <span className="navbar-brand-text">Copernico Academy</span>
        </Link>
        
        <button
          className="navbar-toggler-custom"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon-custom"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav-copernico">
            <li className="nav-item-copernico">
              <Link className={`nav-link-copernico ${location.pathname === "/" ? 'active' : ''}`} to="/">
                Inicio
              </Link>
            </li>
            <li className="nav-item-copernico">
              <Link className="nav-link-copernico" to="/cursos">
                Cursos
              </Link>
            </li>
            <li className="nav-item-copernico">
              <Link className="nav-link-copernico" to="/tutores">
                Tutores
              </Link>
            </li>
            <li className="nav-item-copernico dropdown-copernico">
              <a className="nav-link-copernico dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                Sobre nosotros
              </a>
              <ul className="dropdown-menu-copernico">
                <li><Link className="dropdown-item-copernico" to="/sobre-nosotros">Quiénes somos</Link></li>
                <li><Link className="dropdown-item-copernico" to="/certificados">Sobre el certificado</Link></li>
              </ul>
            </li>
          </ul>
          
          <div className="navbar-actions">
            <div className="search-box">
              <input type="text" placeholder="¿Qué quieres aprender?" className="search-input" />
              <button className="search-btn">🔍</button>
            </div>
            <Link to="/login" className="btn-nav-login">
              Acceder
            </Link>
            <Link to="/signup" className="btn-nav-signup">
              Crear cuenta
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

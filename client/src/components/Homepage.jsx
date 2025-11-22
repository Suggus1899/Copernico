import React from 'react';
import { Link } from 'react-router-dom';
import './Homepage.css';

const Homepage = () => {
  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 hero-content">
              <h1 className="hero-title">
                Estudia gratis y gana certificado en +6.000 cursos online
              </h1>
              <p className="hero-subtitle">
                Accede a tutorías personalizadas y asesoramiento académico de calidad
              </p>
              <div className="hero-buttons">
                <Link to="/signup" className="btn btn-primary btn-lg hero-cta">
                  Crear cuenta gratis
                </Link>
                <Link to="/login" className="btn btn-secondary btn-lg hero-cta-secondary">
                  Iniciar sesión
                </Link>
              </div>
              <p className="hero-disclaimer">
                *Sin datos de tarjetas y sin llamadas de ventas.
              </p>
            </div>
            <div className="col-lg-6 hero-image">
              <div className="certificate-illustration">
                <div className="certificate-card">
                  <div className="certificate-header">
                    <h3>Copernico Academy</h3>
                  </div>
                  <div className="certificate-body">
                    <p className="certificate-name">Estudiante Ejemplo</p>
                    <p className="certificate-course">TUTORÍA PERSONALIZADA</p>
                    <div className="certificate-qr">
                      <div className="qr-placeholder"></div>
                    </div>
                  </div>
                </div>
                <div className="floating-elements">
                  <div className="floating-circle circle-1"></div>
                  <div className="floating-circle circle-2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="row">
            <div className="col-md-4 feature-card">
              <div className="feature-icon">📚</div>
              <h3>Cursos Online</h3>
              <p>Accede a miles de cursos en diferentes áreas del conocimiento</p>
            </div>
            <div className="col-md-4 feature-card">
              <div className="feature-icon">👨‍🏫</div>
              <h3>Tutorías Personalizadas</h3>
              <p>Recibe ayuda de tutores expertos en las materias que necesites</p>
            </div>
            <div className="col-md-4 feature-card">
              <div className="feature-icon">🏆</div>
              <h3>Certificados</h3>
              <p>Obtén certificados reconocidos al completar tus cursos</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;


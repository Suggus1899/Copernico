import React from 'react';
import './StudentHome.css';
const StudentHome = () => {
  const quickLinks = [
    {
      icon: '📚',
      title: 'Mis Cursos',
      description: 'Revisa tus sesiones programadas y el progreso con tus tutores',
      link: '/dashboard/cursos',
      color: '#2563eb'
    },
    {
      icon: '🎥',
      title: 'Videos de Clases',
      description: 'Accede a videos educativos subidos por tus tutores',
      link: '/dashboard/videos',
      color: '#7c3aed'
    },
    {
      icon: '👨‍🏫',
      title: 'Buscar Tutores',
      description: 'Encuentra tutores especializados y solicita asesorías',
      link: '/dashboard/tutores',
      color: '#059669'
    },
    {
      icon: '📝',
      title: 'Mis Apuntes',
      description: 'Organiza y gestiona tus notas de estudio',
      link: '/dashboard/notas',
      color: '#dc2626'
    }
  ];

  return (
    <div className="student-home">
      <header className="student-home__header">
        <h1 className="student-home__title">Bienvenido a Copernico Academy</h1>
        <p className="student-home__subtitle">Tu plataforma de aprendizaje y tutorías</p>
      </header>

      <div className="student-home__welcome">
        <div className="student-home__welcome-icon">🎓</div>
        <h2 className="student-home__welcome-title">¡Bienvenido a tu espacio de aprendizaje!</h2>
        <p className="student-home__welcome-text">
          Desde aquí puedes acceder a todos tus cursos, ver videos de clases, 
          conectar con tutores y gestionar tus apuntes de estudio.
        </p>
      </div>

      <section className="student-home__quick-links">
        <h3 className="student-home__section-title">Accesos rápidos</h3>
        <div className="student-home__grid">
          {quickLinks.map((link, index) => (
            <a
              key={index}
              href={link.link}
              className="student-home__card"
              style={{ '--card-color': link.color } as React.CSSProperties & { '--card-color': string }}
            >
              <div className="student-home__card-icon">{link.icon}</div>
              <h4 className="student-home__card-title">{link.title}</h4>
              <p className="student-home__card-description">{link.description}</p>
              <span className="student-home__card-arrow">→</span>
            </a>
          ))}
        </div>
      </section>

      <section className="student-home__tips">
        <h3 className="student-home__section-title">Comienza tu experiencia</h3>
        <div className="student-home__tips-grid">
          <div className="student-home__tip">
            <span className="student-home__tip-number">1</span>
            <div className="student-home__tip-content">
              <h4>Explora los tutores</h4>
              <p>Busca tutores especializados en las materias que necesitas</p>
            </div>
          </div>
          <div className="student-home__tip">
            <span className="student-home__tip-number">2</span>
            <div className="student-home__tip-content">
              <h4>Solicita asesorías</h4>
              <p>Agenda sesiones con tus tutores favoritos</p>
            </div>
          </div>
          <div className="student-home__tip">
            <span className="student-home__tip-number">3</span>
            <div className="student-home__tip-content">
              <h4>Aprende y crece</h4>
              <p>Accede a videos, toma apuntes y sigue tu progreso</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StudentHome;

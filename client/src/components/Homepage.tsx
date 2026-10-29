import { Link } from 'react-router-dom';
import logo from '../assets/logo.jpg';
import tutoria from '../assets/tutoria-academica.webp';
import './Homepage.css';

const Homepage = () => (
  <main className="homepage">
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-container home-hero__layout">
        <div className="home-hero__copy">
          <p className="home-eyebrow">Aprendizaje con propósito</p>
          <h1 id="home-title">Aprende con el apoyo académico que necesitas.</h1>
          <p className="home-hero__summary">
            Encuentra tutores, organiza tus sesiones y mantén tus clases y materiales en un solo espacio.
          </p>
          <div className="home-hero__actions">
            <Link to="/signup" className="home-button home-button--primary">Crear cuenta</Link>
            <Link to="/login" className="home-button home-button--secondary">Iniciar sesión</Link>
          </div>
          <p className="home-hero__note">Para estudiantes y profesionales que comparten su conocimiento.</p>
        </div>

        <div className="home-hero__visual" role="group" aria-label="Identidad de Copérnico">
          <div className="home-hero__orbit home-hero__orbit--outer" aria-hidden="true" />
          <div className="home-hero__orbit home-hero__orbit--inner" aria-hidden="true" />
          <div className="home-brand-card">
            <img src={logo} alt="Logo de Copérnico" className="home-brand-card__logo" />
            <p className="home-brand-card__name">Copérnico</p>
            <p className="home-brand-card__tagline">El conocimiento nos mueve.</p>
            <div className="home-brand-card__rule" />
            <p className="home-brand-card__detail">Aprendizaje personalizado, en comunidad.</p>
          </div>
          <span className="home-hero__seal" aria-hidden="true">C</span>
        </div>
      </div>
    </section>

    <div className="home-container home-photo">
      <img src={tutoria} alt="Una estudiante y un tutor trabajan juntos en una biblioteca" loading="lazy" />
    </div>
    <section className="home-features" aria-labelledby="home-features-title">
      <div className="home-container">
        <div className="home-features__intro">
          <p className="home-eyebrow">Una experiencia conectada</p>
          <h2 id="home-features-title">Todo lo que necesitas para avanzar</h2>
        </div>
        <div className="home-features__grid">
          <article className="home-feature-card">
            <span className="home-feature-card__number" aria-hidden="true">01</span>
            <h3>Conecta con tutores</h3>
            <p>Encuentra acompañamiento según tus materias y objetivos de aprendizaje.</p>
          </article>
          <article className="home-feature-card">
            <span className="home-feature-card__number" aria-hidden="true">02</span>
            <h3>Organiza tus sesiones</h3>
            <p>Revisa tu agenda y mantén la comunicación sobre cada asesoría.</p>
          </article>
          <article className="home-feature-card">
            <span className="home-feature-card__number" aria-hidden="true">03</span>
            <h3>Sigue tu progreso</h3>
            <p>Consulta tus materiales, notas y avances desde un mismo lugar.</p>
          </article>
        </div>
      </div>
    </section>
  </main>
);

export default Homepage;

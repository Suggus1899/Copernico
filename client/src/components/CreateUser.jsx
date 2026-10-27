import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';

// Misma política mínima que la API; el servidor valida también el límite de 72 bytes.
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const ACCOUNT_TYPES = [
  {
    role: 'student',
    icon: '🎓',
    title: 'Estudiante',
    description: 'Acceso a cursos, tutores y materiales educativos',
  },
  {
    role: 'tutor',
    icon: '👨‍🏫',
    title: 'Tutor',
    description: 'Ofrece tutorías, comparte conocimientos y proporciona asesorías especializadas',
  },
];

const splitList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function CreateUser() {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [fullname, setFullname] = useState('');
  const [studentId, setStudentId] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const emailMismatch = confirmEmail !== '' && email !== confirmEmail;
  const passwordMismatch = confirmPassword !== '' && password !== confirmPassword;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!role) {
      setError('Selecciona un tipo de cuenta.');
      return;
    }
    if (emailMismatch) {
      setError('Los correos no coinciden.');
      return;
    }
    if (passwordMismatch) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!PASSWORD_RULE.test(password)) {
      setError('La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas y números.');
      return;
    }

    // Nombre y apellido se separan por el primer espacio; la API exige al menos 2 caracteres en cada uno.
    const [firstName = '', ...rest] = fullname.trim().replace(/\s+/g, ' ').split(' ');
    const payload = {
      email: email.trim(),
      password,
      role,
      personalInfo: { firstName, lastName: rest.join(' ') },
    };
    if (role === 'student') {
      payload.studentProfile = { studentId: studentId.trim() };
    } else {
      payload.tutorProfile = { specialties: splitList(specialties) };
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/signup', payload);
      navigate(`/login?email=${encodeURIComponent(payload.email)}`, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo crear la cuenta. Inténtalo de nuevo.'));
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-header">
          <h2>Crear Cuenta</h2>
          <p>Únete a S.I Copernico Academy</p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          {/* Selección de tipo de cuenta con tarjetas */}
          <div className="account-type-section">
            <h3 id="account-type-label">¿Qué tipo de cuenta deseas crear?</h3>
            <div className="account-type-cards" role="radiogroup" aria-labelledby="account-type-label">
              {ACCOUNT_TYPES.map((type) => {
                const selected = role === type.role;
                return (
                  <div
                    key={type.role}
                    role="radio"
                    aria-checked={selected}
                    tabIndex={0}
                    className={`account-type-card ${selected ? 'selected' : ''}`}
                    onClick={() => setRole(type.role)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setRole(type.role);
                      }
                    }}
                  >
                    <div className="card-icon">{type.icon}</div>
                    <div className="card-content">
                      <h4>{type.title}</h4>
                      <p>{type.description}</p>
                    </div>
                    <div className={`card-radio ${selected ? 'checked' : ''}`}>
                      <div className="radio-dot"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Información personal */}
          <div className="form-section">
            <h3>Información Personal</h3>
            <div className="form-grid">
              <div className="input-group">
                <label htmlFor="fullname">Nombre Completo</label>
                <input
                  type="text"
                  id="fullname"
                  autoComplete="name"
                  placeholder="Ingresa tu nombre completo"
                  onChange={(e) => setFullname(e.target.value)}
                  value={fullname}
                  required
                  disabled={loading}
                />
              </div>

              {role === 'student' && (
                <div className="input-group">
                  <label htmlFor="studentId">ID estudiantil</label>
                  <input
                    type="text"
                    id="studentId"
                    placeholder="Ej. 2024-0001"
                    maxLength={30}
                    onChange={(e) => setStudentId(e.target.value)}
                    value={studentId}
                    required
                    disabled={loading}
                  />
                </div>
              )}

              {role === 'tutor' && (
                <div className="input-group">
                  <label htmlFor="specialties">Especialidades</label>
                  <input
                    type="text"
                    id="specialties"
                    placeholder="Separadas por comas, p. ej. Matemáticas, Física"
                    onChange={(e) => setSpecialties(e.target.value)}
                    value={specialties}
                    required
                    disabled={loading}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Información de acceso */}
          <div className="form-section">
            <h3>Información de Acceso</h3>
            <div className="input-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input
                type="email"
                id="email"
                autoComplete="email"
                placeholder="tu@email.com"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                required
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label htmlFor="confirmemail">Confirmar Correo Electrónico</label>
              <input
                type="email"
                id="confirmemail"
                autoComplete="email"
                placeholder="Confirma tu correo electrónico"
                onChange={(e) => setConfirmEmail(e.target.value)}
                value={confirmEmail}
                required
                disabled={loading}
                className={emailMismatch ? 'input-error' : ''}
              />
              {emailMismatch && <span className="error-message">Los correos no coinciden</span>}
            </div>
          </div>

          {/* Seguridad */}
          <div className="form-section">
            <h3>Seguridad</h3>
            <div className="input-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                autoComplete="new-password"
                placeholder="Crea una contraseña segura"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                required
                minLength="8"
                disabled={loading}
              />
              <div className="password-requirements">
                <small className="help-text">
                  <span className="req-icon">✓</span> Al menos 8 caracteres
                </small>
                <small className="help-text">
                  <span className="req-icon">✓</span> Una letra mayúscula
                </small>
                <small className="help-text">
                  <span className="req-icon">✓</span> Una letra minúscula
                </small>
                <small className="help-text">
                  <span className="req-icon">✓</span> Un número
                </small>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirmar Contraseña</label>
              <input
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                onChange={(e) => setConfirmPassword(e.target.value)}
                value={confirmPassword}
                required
                minLength="8"
                disabled={loading}
                className={passwordMismatch ? 'input-error' : ''}
              />
              {passwordMismatch && <span className="error-message">Las contraseñas no coinciden</span>}
            </div>
          </div>

          {/* Botón de registro */}
          <div className="form-actions">
            <button type="submit" className="signup-btn" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear Mi Cuenta'}
            </button>
          </div>
        </form>

        <div className="signup-footer">
          <p>¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link></p>
        </div>
      </div>
    </div>
  );
}

export default CreateUser;

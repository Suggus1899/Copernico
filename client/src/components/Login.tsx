import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';
import './AuthPages.css';
function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Tras el registro llega ?email=... para precargar el correo.
  const registeredEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState(registeredEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // La sesión queda en una cookie HttpOnly que emite la API.
      await apiClient.post('/auth/signin', { email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo iniciar sesión. Inténtalo de nuevo.'));
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Iniciar Sesión</h2>
        <p>Bienvenido de nuevo, ¡inicia sesión en tu cuenta!</p>
        {registeredEmail && !error && (
          <div className="alert alert-success" role="alert">
            ¡Cuenta creada exitosamente! Por favor, inicia sesión con tus credenciales.
          </div>
        )}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              type="email"
              id="email"
              autoComplete="email"
              placeholder="Ingresa tu correo electrónico"
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              value={email}
              required
              disabled={loading}
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              autoComplete="current-password"
              placeholder="Ingresa tu contraseña"
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              value={password}
              required
              disabled={loading}
            />
          </div>
          <button type="submit" className="sign-in-btn" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
        <p className="signup-link">
          ¿No tienes una cuenta? <Link to="/signup">Regístrate ahora</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;

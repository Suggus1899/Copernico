import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';
// Desactiva la cuenta en el servidor: se cierra la sesión y no se puede volver a iniciar sesión.
const DeactivateAccount = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (confirmText !== 'DESACTIVAR') {
      setError('Escribe DESACTIVAR para confirmar.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/deactivate', { currentPassword: password });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo desactivar la cuenta.'));
      setLoading(false);
    }
  };

  return (
    <section className="deactivate-account" aria-labelledby="deactivate-account-title">
      <h3 id="deactivate-account-title">Desactivar cuenta</h3>
      <p className="help-text">
        Tu cuenta quedará desactivada y se cerrará tu sesión. No podrás volver a iniciar sesión;
        para reactivarla, contacta con la administración.
      </p>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="input-group">
          <label htmlFor="deactivate-password">Contraseña actual</label>
          <input
            id="deactivate-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="input-group">
          <label htmlFor="deactivate-confirm">Escribe DESACTIVAR para confirmar</label>
          <input
            id="deactivate-confirm"
            type="text"
            autoComplete="off"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <button type="submit" className="btn btn-danger" disabled={loading}>
          {loading ? 'Desactivando...' : 'Desactivar cuenta'}
        </button>
      </form>
    </section>
  );
};

export default DeactivateAccount;

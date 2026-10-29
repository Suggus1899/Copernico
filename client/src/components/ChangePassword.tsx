import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from './Theme';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';
import './Account.css';
// Misma política que la API (src/utils/passwordPolicy.js): 8-72 bytes con minúscula, mayúscula y número.
const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener entre 8 y 72 caracteres e incluir una minúscula, una mayúscula y un número.';

const isStrongPassword = (value: string) =>
  value.length >= 8 &&
  new TextEncoder().encode(value).length <= 72 &&
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /\d/.test(value);

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isStrongPassword(newPassword)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      // Las contraseñas no se recortan: la API las usa tal cual.
      await apiClient.post('/auth/change-password', { currentPassword, newPassword });
      setSuccess('Contraseña actualizada correctamente. Las demás sesiones abiertas se han cerrado.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al cambiar la contraseña.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="change-password-container">
      <ThemeToggle />
      <Link className="account-back" to="/dashboard">Volver al panel</Link>
      <h1>Cambiar contraseña</h1>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {success && <div className="alert alert-success" role="status">{success}</div>}
      <form onSubmit={onSubmit}>
        <div className="input-group">
          <label htmlFor="currentPassword">Contraseña actual</label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="input-group">
          <label htmlFor="newPassword">Nueva contraseña</label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={loading}
            placeholder="(8+ con mayúscula, minúscula y número)"
          />
        </div>
        <div className="input-group">
          <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar contraseña'}
        </button>
      </form>
    </main>
  );
};

export default ChangePassword;

import React, { useState } from 'react';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';
import './Account.css';
const ChangeEmail = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newEmail.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setError('Los correos no coinciden.');
      return;
    }

    setLoading(true);
    try {
      // La API renueva la sesión: el usuario sigue dentro con el nuevo correo.
      await apiClient.post('/auth/change-email', {
        currentPassword,
        newEmail: newEmail.trim(),
      });
      setSuccess('Correo actualizado correctamente.');
      setCurrentPassword('');
      setNewEmail('');
      setConfirmEmail('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al cambiar el correo.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-email-container">
      <h2>Cambiar dirección de correo electrónico</h2>
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
          <label htmlFor="newEmail">Nuevo correo</label>
          <input
            id="newEmail"
            type="email"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="input-group">
          <label htmlFor="confirmEmail">Confirmar nuevo correo</label>
          <input
            id="confirmEmail"
            type="email"
            autoComplete="email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar correo'}
        </button>
      </form>
    </div>
  );
};

export default ChangeEmail;

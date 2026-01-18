import React, { useState } from 'react';
import apiClient from '../utils/axiosConfig';
import './Account.css';

const ChangeEmail = () => {
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newEmail.trim() !== confirmEmail.trim()) {
      setError('Los correos no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/change-email', { newEmail: newEmail.trim() });
      if (res.data?.success) {
        setSuccess('Correo actualizado correctamente.');
        setNewEmail('');
        setConfirmEmail('');
      } else {
        setError(res.data?.error || 'No se pudo actualizar el correo.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar el correo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-email-container">
      <h2>Cambiar dirección de correo electrónico</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={onSubmit}>
        <div className="input-group">
          <label htmlFor="newEmail">Nuevo correo</label>
          <input
            id="newEmail"
            type="email"
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

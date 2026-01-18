import React, { useState } from 'react';
import apiClient from '../utils/axiosConfig';

const DeleteAccount = () => {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (confirmText !== 'ELIMINAR') {
      setError('Debes escribir ELIMINAR para confirmar');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.delete('/users/me', { data: { password } });
      if (res.data?.success) {
        setSuccess('Tu cuenta ha sido eliminada');
        // Opcional: limpiar token y redirigir
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          localStorage.removeItem('token');
        }
        window.location.href = '/';
      } else {
        setError(res.data?.error || 'No se pudo eliminar la cuenta');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Eliminar cuenta</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={onSubmit}>
        <div className="input-group">
          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="input-group">
          <label>Escribe "ELIMINAR" para confirmar</label>
          <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} required />
        </div>
        <button className="btn btn-danger" disabled={loading}>{loading ? 'Eliminando...' : 'Eliminar cuenta'}</button>
      </form>
    </div>
  );
};

export default DeleteAccount;

import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';

const LanguageSettings = () => {
  const [language, setLanguage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/users/profile');
        setLanguage(res.data?.data?.personalInfo?.language || '');
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await apiClient.put('/users/profile', { personalInfo: { language } });
      if (res.data?.success) {
        setSuccess('Idioma actualizado');
      } else {
        setError(res.data?.error || 'No se pudo actualizar');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Idioma</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={onSubmit}>
        <div className="input-group">
          <label>Selecciona tu idioma</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="">Selecciona...</option>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
        <button className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
      </form>
    </div>
  );
};

export default LanguageSettings;

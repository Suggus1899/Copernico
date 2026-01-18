import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import './Account.css';
import AvatarUploader from './AvatarUploader';

const ProfileSettings = () => {
  const [form, setForm] = useState({
    personalInfo: {
      firstName: '',
      lastName: '',
      username: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      province: '',
      postalCode: '',
      language: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await apiClient.get('/users/profile');
        const data = res.data?.data || {};
        setForm({
          personalInfo: {
            firstName: data.personalInfo?.firstName || '',
            lastName: data.personalInfo?.lastName || '',
            username: data.personalInfo?.username || '',
            phone: data.personalInfo?.phone || '',
            address: data.personalInfo?.address || '',
            city: data.personalInfo?.city || '',
            country: data.personalInfo?.country || '',
            province: data.personalInfo?.province || '',
            postalCode: data.personalInfo?.postalCode || '',
            language: data.personalInfo?.language || ''
          }
        });
      } catch (err) {
        setError('No se pudo cargar el perfil');
      }
    };
    loadProfile();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [name]: value
      }
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await apiClient.put('/users/profile', form);
      if (res.data?.success) {
        setSuccess('Perfil actualizado correctamente');
      } else {
        setError(res.data?.error || 'No se pudo actualizar el perfil');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-settings">
      <h2>Editar perfil</h2>
      <AvatarUploader />
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={onSubmit}>
        <div className="grid-2">
          <div className="input-group">
            <label>Nombre</label>
            <input name="firstName" value={form.personalInfo.firstName} onChange={onChange} />
          </div>
          <div className="input-group">
            <label>Apellido</label>
            <input name="lastName" value={form.personalInfo.lastName} onChange={onChange} />
          </div>
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label>Usuario</label>
            <input name="username" value={form.personalInfo.username} onChange={onChange} />
          </div>
          <div className="input-group">
            <label>Teléfono</label>
            <input name="phone" value={form.personalInfo.phone} onChange={onChange} />
          </div>
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label>Dirección</label>
            <input name="address" value={form.personalInfo.address} onChange={onChange} />
          </div>
          <div className="input-group">
            <label>Ciudad</label>
            <input name="city" value={form.personalInfo.city} onChange={onChange} />
          </div>
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label>Provincia</label>
            <input name="province" value={form.personalInfo.province} onChange={onChange} />
          </div>
          <div className="input-group">
            <label>País</label>
            <input name="country" value={form.personalInfo.country} onChange={onChange} />
          </div>
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label>Código Postal</label>
            <input name="postalCode" value={form.personalInfo.postalCode} onChange={onChange} />
          </div>
          <div className="input-group">
            <label>Idioma</label>
            <select name="language" value={form.personalInfo.language} onChange={onChange}>
              <option value="">Selecciona...</option>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
};

export default ProfileSettings;

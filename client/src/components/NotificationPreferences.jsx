import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import './Account.css';

const NotificationPreferences = () => {
  const [prefs, setPrefs] = useState({
    communicationSettings: {
      allowNotifications: true,
      emailNotifications: true,
      notificationPreferences: ['email']
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/users/profile');
        const cs = res.data?.data?.communicationSettings || {};
        setPrefs({
          communicationSettings: {
            allowNotifications: cs.allowNotifications ?? true,
            emailNotifications: cs.emailNotifications ?? true,
            notificationPreferences: cs.notificationPreferences || ['email']
          }
        });
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const toggleList = (name) => (e) => {
    const value = e.target.checked;
    setPrefs((prev) => ({
      ...prev,
      communicationSettings: {
        ...prev.communicationSettings,
        [name]: value
      }
    }));
  };

  const togglePreference = (pref) => (e) => {
    const checked = e.target.checked;
    setPrefs((prev) => {
      const list = new Set(prev.communicationSettings.notificationPreferences || []);
      if (checked) list.add(pref); else list.delete(pref);
      return {
        ...prev,
        communicationSettings: {
          ...prev.communicationSettings,
          notificationPreferences: Array.from(list)
        }
      };
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await apiClient.put('/users/profile/preferences', prefs);
      if (res.data?.success) {
        setSuccess('Preferencias guardadas');
      } else {
        setError(res.data?.error || 'No se pudieron guardar');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const cs = prefs.communicationSettings;

  return (
    <div>
      <h2>Preferencias de notificaciones</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={onSubmit}>
        <div className="input-group">
          <label>
            <input type="checkbox" checked={!!cs.allowNotifications} onChange={toggleList('allowNotifications')} />
            Habilitar notificaciones
          </label>
        </div>
        <div className="input-group">
          <label>
            <input type="checkbox" checked={!!cs.emailNotifications} onChange={toggleList('emailNotifications')} />
            Notificaciones por email
          </label>
        </div>
        <div className="input-group">
          <label>Canales</label>
          <div className="checkbox-group">
            <label><input type="checkbox" checked={cs.notificationPreferences?.includes('email')} onChange={togglePreference('email')} /> Email</label>
            <label><input type="checkbox" checked={cs.notificationPreferences?.includes('push')} onChange={togglePreference('push')} /> Push</label>
            <label><input type="checkbox" checked={cs.notificationPreferences?.includes('sms')} onChange={togglePreference('sms')} /> SMS</label>
          </div>
        </div>
        <button className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
      </form>
    </div>
  );
};

export default NotificationPreferences;

import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import SidebarMenu from './SidebarMenu';
import './Dashboard.css';

const Advisories = () => {
  const [advisories, setAdvisories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/auth/profile');
        const user = res.data.data || res.data;
        // Si tienes advisorProfile con citas/asesorías, ajusta aquí.
        const items = user?.advisorProfile?.appointments || user?.studentProfile?.appointments || [];
        setAdvisories(items);
      } catch (err) {
        setError(err.response?.data?.error || 'No se pudo cargar tu asesoría');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container">
        <SidebarMenu />
        <div className="dashboard-content">
          <p>Cargando tu asesoría...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <SidebarMenu />
      <div className="dashboard-content">
        <h2>Asesoría</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        {advisories.length === 0 ? (
          <p>No tienes asesorías registradas aún.</p>
        ) : (
          <ul className="courses-list">
            {advisories.map((a, idx) => (
              <li key={idx} className="course-item">
                <div className="course-card">
                  <h3 className="course-title">{a?.title || 'Asesoría'}</h3>
                  {a?.date && <p className="course-description">Fecha: {new Date(a.date).toLocaleString('es-ES')}</p>}
                  {a?.description && <p className="course-description">{a.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Advisories;

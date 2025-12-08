import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import SidebarMenu from './SidebarMenu';
import './Dashboard.css';

const Tutors = () => {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const res = await apiClient.get('/users', { params: { role: 'tutor' } });
        setTutors(res.data || []);
      } catch (err) {
        setError('No se pudieron cargar los tutores');
      } finally {
        setLoading(false);
      }
    };
    fetchTutors();
  }, []);

  return (
    <div className="dashboard-container">
      <SidebarMenu />
      <div className="dashboard-content">
        <h2>Tutores</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        {loading ? (
          <p>Cargando...</p>
        ) : (
          <div className="card-grid">
            {tutors.map((tutor) => (
              <div key={tutor._id || tutor.id} className="card">
                <div className="card-header">
                  <div className="avatar" aria-hidden />
                  <div>
                    <h3>{tutor.personalInfo?.firstName} {tutor.personalInfo?.lastName}</h3>
                    <p className="muted">{tutor.personalInfo?.email}</p>
                  </div>
                </div>
                <div className="card-body">
                  <p><strong>Especialidades:</strong> {(tutor.tutorProfile?.specialties || []).join(', ') || 'General'}</p>
                </div>
                <div className="card-actions">
                  <button className="btn">Ver perfil</button>
                  <button className="btn btn-primary">Solicitar asesoría</button>
                </div>
              </div>
            ))}
            {tutors.length === 0 && <p className="muted">No hay tutores disponibles.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tutors;

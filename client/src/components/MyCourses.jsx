import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import SidebarMenu from './SidebarMenu';
import './Dashboard.css';

const MyCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/auth/profile');
        const user = res.data.data || res.data;
        const enrolled = user?.studentProfile?.enrolledCourses || [];
        setCourses(enrolled);
      } catch (err) {
        setError(err.response?.data?.error || 'No se pudo cargar tus cursos');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-content">
          <p>Cargando tus cursos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <SidebarMenu />
      <div className="dashboard-content">
        <h2>Mis Cursos</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        {courses.length === 0 ? (
          <p>No estás inscrito en ningún curso aún.</p>
        ) : (
          <ul className="courses-list">
            {courses.map((c, idx) => (
              <li key={idx} className="course-item">
                <div className="course-card">
                  <h3 className="course-title">{typeof c === 'string' ? c : (c?.name || 'Curso')}</h3>
                  {typeof c !== 'string' && c?.description && (
                    <p className="course-description">{c.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MyCourses;

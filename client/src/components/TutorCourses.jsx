import React, { Component } from 'react';
import TutorSidebarMenu from './TutorSidebarMenu';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';

class TutorCourses extends Component {
  state = {
    user: null,
    courses: [],
    loading: false
  };

  componentDidMount() {
    // TODO: Load tutor's courses from API
    this.setState({
      courses: [
        {
          id: 1,
          name: 'Matemáticas Avanzadas',
          subject: 'Matemáticas',
          level: 'Universitario',
          students: 12,
          schedule: 'Lunes y Miércoles 14:00-16:00',
          status: 'active'
        },
        {
          id: 2,
          name: 'Física Cuántica',
          subject: 'Física',
          level: 'Posgrado',
          students: 8,
          schedule: 'Martes y Jueves 10:00-12:00',
          status: 'active'
        },
        {
          id: 3,
          name: 'Química Orgánica',
          subject: 'Química',
          level: 'Universitario',
          students: 15,
          schedule: 'Viernes 09:00-13:00',
          status: 'active'
        }
      ]
    });
  }

  render() {
    const { courses, loading } = this.state;

    return (
      <div className="dashboard-container">
        <TutorSidebarMenu />
        <div className="dashboard-content">
          <div className="dashboard-header">
            <h1>Mis Cursos / Grupos</h1>
            <p>Gestiona tus cursos y grupos de estudiantes</p>
          </div>

          <div className="dashboard-main">
            <div className="action-buttons">
              <button className="btn-primary">Crear Nuevo Curso</button>
              <button className="btn-secondary">Crear Grupo</button>
            </div>

            <div className="courses-grid">
              {courses.map((course) => (
                <div key={course.id} className="course-card">
                  <div className="course-header">
                    <h3>{course.name}</h3>
                    <span className={`status-badge ${course.status}`}>{course.status}</span>
                  </div>
                  <div className="course-info">
                    <p><strong>Materia:</strong> {course.subject}</p>
                    <p><strong>Nivel:</strong> {course.level}</p>
                    <p><strong>Estudiantes:</strong> {course.students}</p>
                    <p><strong>Horario:</strong> {course.schedule}</p>
                  </div>
                  <div className="course-actions">
                    <button className="btn-outline">Editar</button>
                    <button className="btn-outline">Ver Estudiantes</button>
                    <button className="btn-outline">Gestionar Materiales</button>
                  </div>
                </div>
              ))}
            </div>

            {courses.length === 0 && (
              <div className="empty-state">
                <h3>No tienes cursos activos</h3>
                <p>Crea tu primer curso para comenzar a enseñar</p>
                <button className="btn-primary">Crear Primer Curso</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default TutorCourses;

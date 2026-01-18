import React, { Component } from 'react';
import TutorSidebarMenu from './TutorSidebarMenu';
import './Dashboard.css';

class TutorProgress extends Component {
  state = {
    students: [],
    selectedCourse: 'all'
  };

  componentDidMount() {
    this.setState({
      students: [
        {
          id: 1,
          name: 'Ana García',
          course: 'Matemáticas Avanzadas',
          overallProgress: 85,
          assignments: [
            { name: 'Examen Parcial', score: 90, maxScore: 100 },
            { name: 'Tarea Álgebra', score: 85, maxScore: 100 },
            { name: 'Proyecto Final', score: 80, maxScore: 100 }
          ],
          attendance: 95,
          lastActivity: 'Hace 2 horas'
        },
        {
          id: 2,
          name: 'Carlos Rodríguez',
          course: 'Física Cuántica',
          overallProgress: 92,
          assignments: [
            { name: 'Laboratorio Mecánica', score: 95, maxScore: 100 },
            { name: 'Examen Final', score: 88, maxScore: 100 }
          ],
          attendance: 100,
          lastActivity: 'Hace 1 día'
        }
      ]
    });
  }

  render() {
    const { students, selectedCourse } = this.state;
    const filteredStudents = selectedCourse === 'all'
      ? students
      : students.filter(s => s.course === selectedCourse);

    return (
      <div className="dashboard-container">
        <TutorSidebarMenu />
        <div className="dashboard-content">
          <div className="dashboard-header">
            <h1>Progreso de Estudiantes</h1>
            <p>Monitorea el rendimiento y progreso de tus estudiantes</p>
          </div>

          <div className="dashboard-main">
            <div className="progress-controls">
              <select
                value={selectedCourse}
                onChange={(e) => this.setState({ selectedCourse: e.target.value })}
                className="course-filter"
              >
                <option value="all">Todos los cursos</option>
                <option value="Matemáticas Avanzadas">Matemáticas Avanzadas</option>
                <option value="Física Cuántica">Física Cuántica</option>
                <option value="Química Orgánica">Química Orgánica</option>
              </select>
            </div>

            <div className="students-progress">
              {filteredStudents.map((student) => (
                <div key={student.id} className="student-progress-card">
                  <div className="student-header">
                    <h3>{student.name}</h3>
                    <span className="course-badge">{student.course}</span>
                  </div>

                  <div className="progress-overview">
                    <div className="progress-metric">
                      <h4>Progreso General</h4>
                      <div className="progress-circle">
                        <div className="progress-fill" style={{'--percentage': `${student.overallProgress}%`}}>
                          {student.overallProgress}%
                        </div>
                      </div>
                    </div>

                    <div className="progress-metric">
                      <h4>Asistencia</h4>
                      <div className="attendance-bar">
                        <div className="attendance-fill" style={{width: `${student.attendance}%`}}>
                          {student.attendance}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="assignments-list">
                    <h4>Tareas y Exámenes</h4>
                    {student.assignments.map((assignment, index) => (
                      <div key={index} className="assignment-item">
                        <span className="assignment-name">{assignment.name}</span>
                        <span className="assignment-score">
                          {assignment.score}/{assignment.maxScore}
                        </span>
                        <span className="assignment-percentage">
                          ({Math.round((assignment.score / assignment.maxScore) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="student-actions">
                    <button className="btn-outline small">Ver Detalles</button>
                    <button className="btn-outline small">Enviar Mensaje</button>
                    <span className="last-activity">Última actividad: {student.lastActivity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default TutorProgress;

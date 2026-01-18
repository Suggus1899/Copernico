import React, { Component } from 'react';
import TutorSidebarMenu from './TutorSidebarMenu';
import './Dashboard.css';

class TutorAgenda extends Component {
  state = {
    classes: [],
    selectedDate: new Date().toISOString().split('T')[0]
  };

  componentDidMount() {
    this.setState({
      classes: [
        { id: 1, subject: 'Matemáticas Avanzadas', student: 'Ana García', time: '14:00', duration: 120, date: '2024-01-15', type: 'class' },
        { id: 2, subject: 'Física Cuántica', student: 'Carlos Rodríguez', time: '16:30', duration: 90, date: '2024-01-15', type: 'class' },
        { id: 3, subject: 'Química Orgánica', student: 'María López', time: '10:00', duration: 240, date: '2024-01-16', type: 'class' },
        { id: 4, subject: 'Asesoría Personalizada', student: 'Juan Pérez', time: '15:00', duration: 60, date: '2024-01-17', type: 'advisory' }
      ]
    });
  }

  render() {
    const { classes, selectedDate } = this.state;
    const todayClasses = classes.filter(c => c.date === selectedDate);

    return (
      <div className="dashboard-container">
        <TutorSidebarMenu />
        <div className="dashboard-content">
          <div className="dashboard-header">
            <h1>Agenda de Clases</h1>
            <p>Gestiona tus clases y asesorías programadas</p>
          </div>

          <div className="dashboard-main">
            <div className="agenda-controls">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => this.setState({ selectedDate: e.target.value })}
                className="date-picker"
              />
              <button className="btn-primary">Programar Nueva Clase</button>
            </div>

            <div className="agenda-calendar">
              <div className="today-schedule">
                <h2>Clases del {new Date(selectedDate).toLocaleDateString('es-ES')}</h2>
                {todayClasses.length > 0 ? (
                  <div className="schedule-list">
                    {todayClasses.map((classItem) => (
                      <div key={classItem.id} className={`schedule-item ${classItem.type}`}>
                        <div className="schedule-time">
                          <span className="time">{classItem.time}</span>
                          <span className="duration">({classItem.duration}min)</span>
                        </div>
                        <div className="schedule-info">
                          <h4>{classItem.subject}</h4>
                          <p>Estudiante: {classItem.student}</p>
                          <span className={`type-badge ${classItem.type}`}>
                            {classItem.type === 'class' ? 'Clase' : 'Asesoría'}
                          </span>
                        </div>
                        <div className="schedule-actions">
                          <button className="btn-outline small">Unirse</button>
                          <button className="btn-outline small">Editar</button>
                          <button className="btn-outline small">Cancelar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-classes">
                    <p>No hay clases programadas para esta fecha</p>
                    <button className="btn-secondary">Programar Clase</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default TutorAgenda;

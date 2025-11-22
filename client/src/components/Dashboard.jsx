import React from 'react';
import SidebarMenu from './SidebarMenu';
import UserProfile from './UserProfile';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <SidebarMenu />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Bienvenido a Copernico Academy</h1>
          <p>Tu plataforma de aprendizaje y tutorías</p>
        </div>
        <div className="dashboard-main">
          <UserProfile />
          <div className="dashboard-welcome">
            <div className="welcome-card">
              <h2>¡Bienvenido de nuevo!</h2>
              <p>Has iniciado sesión correctamente. Explora todas las funcionalidades disponibles desde el menú lateral.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

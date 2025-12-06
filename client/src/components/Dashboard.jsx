import React from 'react';
import { Outlet } from 'react-router-dom';
import SidebarMenu from './SidebarMenu';
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
          {/* Renderiza vistas específicas dentro del layout del Dashboard */}
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

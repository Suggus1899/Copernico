import React, { Component } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import SidebarMenu from './SidebarMenu';
import TutorDashboard from './TutorDashboard';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';

class Dashboard extends Component {
  state = {
    user: null,
    loading: true,
    error: null
  };

  componentDidMount() {
    this.loadUserProfile();
  }

  loadUserProfile = async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      this.setState({
        user: response.data.data,
        loading: false
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.setState({
        error: 'Error al cargar el perfil de usuario',
        loading: false
      });
    }
  };

  render() {
    const { user, loading, error } = this.state;

    if (loading) {
      return (
        <div className="dashboard-container">
          <div className="dashboard-content">
            <div className="loading-spinner">Cargando dashboard...</div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="dashboard-container">
          <div className="dashboard-content">
            <div className="error-message">{error}</div>
          </div>
        </div>
      );
    }

    // Redirigir según el rol del usuario
    if (user?.role === 'tutor' || user?.role === 'advisor') {
      return <TutorDashboard />;
    }

    // Para estudiantes y otros roles, mostrar dashboard genérico
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
  }
}

export default Dashboard;

import React, { Component } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import TutorSidebarMenu from './TutorSidebarMenu';
import TutorHome from './TutorHome';
import './Dashboard.css';

class TutorDashboard extends Component {
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

    return (
      <div className="dashboard-container">
        <TutorSidebarMenu userRole={user?.role} />
        <div className="dashboard-content">
          
          <div className="dashboard-main">
            {/* Mostrar TutorHome por defecto o el componente de la ruta específica */}
            <TutorHomeWrapper />
          </div>
        </div>
      </div>
    );
  }
}

// Componente wrapper para manejar la lógica de mostrar TutorHome o Outlet
const TutorHomeWrapper = () => {
  const location = useLocation();
  const isRootDashboard = location.pathname === '/dashboard' || location.pathname === '/dashboard/';
  
  return isRootDashboard ? <TutorHome /> : <Outlet />;
};

export default TutorDashboard;

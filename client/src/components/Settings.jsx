import React, { useState } from 'react';
import SidebarMenu from './SidebarMenu';
import ChangeEmail from './ChangeEmail';
import ChangePassword from './ChangePassword';
import './Dashboard.css';

const Settings = () => {
  const [tab, setTab] = useState('password');

  return (
    <div className="dashboard-container">
      <SidebarMenu />
      <div className="dashboard-content">
        <h2>Configuración</h2>
        <div className="tabs">
          <button className={`tab-btn ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>Contraseña</button>
          <button className={`tab-btn ${tab === 'email' ? 'active' : ''}`} onClick={() => setTab('email')}>Email</button>
        </div>
        <div className="tab-panel">
          {tab === 'password' ? <ChangePassword /> : <ChangeEmail />}
        </div>
      </div>
    </div>
  );
};

export default Settings;

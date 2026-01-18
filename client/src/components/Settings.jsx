import React, { useState } from 'react';
import SidebarMenu from './SidebarMenu';
import ChangeEmail from './ChangeEmail';
import ChangePassword from './ChangePassword';
import ProfileSettings from './ProfileSettings';
import NotificationPreferences from './NotificationPreferences';
import LanguageSettings from './LanguageSettings';
import RoleSettings from './RoleSettings';
import ActivityLog from './ActivityLog';
import DeleteAccount from './DeleteAccount';
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
          <button className={`tab-btn ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Perfil</button>
          <button className={`tab-btn ${tab === 'preferences' ? 'active' : ''}`} onClick={() => setTab('preferences')}>Preferencias</button>
          <button className={`tab-btn ${tab === 'language' ? 'active' : ''}`} onClick={() => setTab('language')}>Idioma</button>
          <button className={`tab-btn ${tab === 'role' ? 'active' : ''}`} onClick={() => setTab('role')}>Rol</button>
          <button className={`tab-btn ${tab === 'security' ? 'active' : ''}`} onClick={() => setTab('security')}>Seguridad</button>
          <button className={`tab-btn ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>Actividad</button>
        </div>
        <div className="tab-panel">
          {tab === 'password' && <ChangePassword />}
          {tab === 'email' && <ChangeEmail />}
          {tab === 'profile' && <ProfileSettings />}
          {tab === 'preferences' && <NotificationPreferences />}
          {tab === 'language' && <LanguageSettings />}
          {tab === 'role' && <RoleSettings />}
          {tab === 'security' && <DeleteAccount />}
          {tab === 'activity' && <ActivityLog />}
        </div>
      </div>
    </div>
  );
};

export default Settings;

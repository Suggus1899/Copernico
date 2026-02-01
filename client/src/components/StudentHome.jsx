import React from 'react';

const StudentHome = () => {
  return (
    <div className="dashboard-welcome">
      <div className="dashboard-header" style={{position: 'relative', top:'130px', width: '900px'}}>
   <h1>Bienvenido a Copernico Academy</h1>
   <p>Tu plataforma de aprendizaje y tutorías</p>
      </div>
      <div className="welcome-card" style={{position: 'relative', top: '260px', width: '1100px', height: '200px', right: '900px'}}>
        <h2>¡Bienvenido a tu espacio de aprendizaje!</h2>
        <p>
          Desde aquí puedes acceder a todos tus cursos, ver videos de clases, 
          conectar con tutores, programar asesorías y gestionar tus apuntes de estudio.
        </p>
        <p>
          Explora las opciones del menú superior para comenzar tu experiencia de aprendizaje.
        </p>
      </div>
    </div>
  );
};

export default StudentHome;
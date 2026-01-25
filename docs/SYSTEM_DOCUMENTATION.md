# Documentación del Sistema - Copernico Academy

## 1. Visión General
**Copernico Academy** es una plataforma integral de gestión académica diseñada para facilitar la interacción entre estudiantes, tutores y asesores. El sistema permite la gestión eficiente de tutorías, seguimiento de progreso académico, y distribución de materiales educativos.

## 2. Arquitectura del Sistema
El sistema utiliza una arquitectura basada en microservicios simulada a través de contenedores Docker, y sigue el patrón de diseño **MVC (Modelo-Vista-Controlador)** en el backend.

### 2.1 Diagrama de Arquitectura
- **Frontend (Cliente):** Aplicación SPA (Single Page Application) construida con React y Vite. Interactúa con el backend a través de una API REST.
- **Backend (Servidor):** Servidor API RESTful construido con Node.js y Express. Maneja la lógica de negocio, autenticación y conexión a datos.
- **Base de Datos:** MongoDB (NoSQL) para el almacenamiento flexible de datos documentales.

### 2.2 Patrón de Diseño (Backend)
- **Modelos (`src/models`):** Definiciones de esquemas de datos utilizando Mongoose (User, Appointment, Report, etc.).
- **Controladores (`src/controllers`):** Lógica del negocio que procesa las solicitudes y respuestas (authController, userController, etc.).
- **Rutas (`src/routes`):** Definición de endpoints de la API y asignación de controladores.
- **Middlewares (`src/middlewares`):** Capas intermedias para validación (Zod), autenticación (JWT) y manejo de errores.

## 3. Módulos del Sistema

### 3.1 Módulo de Usuarios y Autenticación
- Registro e inicio de sesión seguro.
- Gestión de roles: Administrador, Tutor, Asesor, Estudiante.
- Perfiles de usuario editables.

### 3.2 Módulo de Citas (Appointments)
- Programación de tutorías y asesorías.
- Gestión de estados de citas (pendiente, confirmada, cancelada).
- Calificación y retroalimentación de sesiones.

### 3.3 Módulo Académico
- **Materiales Educativos:** Subida, descarga y gestión de recursos.
- **Tareas (Assignments):** Asignación, entrega y calificación de actividades.
- **Seguimiento (Progress Tracking):** Monitoreo del avance del estudiante.

### 3.4 Módulo de Reportes y Notificaciones
- Generación de reportes de progreso.
- Sistema de notificaciones para eventos importantes.

## 4. Tecnologías Utilizadas

### Backend
- **Node.js & Express:** Núcleo del servidor.
- **MongoDB & Mongoose:** Persistencia de datos.
- **JWT (JsonWebToken):** Seguridad y autenticación.
- **Zod:** Validación de esquemas y datos.
- **BcryptJS:** Encriptación de contraseñas.

### Frontend
- **React:** Biblioteca de interfaz de usuario.
- **Vite:** Empaquetador y servidor de desarrollo rápido.
- **Tailwind CSS & Bootswatch:** Estilos y diseño responsivo.
- **Axios:** Cliente HTTP para comunicación con la API.

### Infraestructura / DevOps
- **Docker & Docker Compose:** Contenerización y orquestación de servicios para facilitar el despliegue y desarrollo.
- **Nodemon:** Herramienta de desarrollo para reinicio automático del servidor.

## 5. Endpoints Principales de la AP
La API se expone bajo el prefijo `/api`.
- `/api/auth`: Autenticación.
- `/api/users`: Gestión de usuarios.
- `/api/appointments`: Gestión de citas.
- `/api/materials`: Recursos educativos.
- `/api/assignments`: Tareas.
- `/api/reports`: Reportes académicos.

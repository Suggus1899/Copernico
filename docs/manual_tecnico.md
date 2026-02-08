# Manual Técnico - S.I-Copernico-Academy

## 1. Visión General de la Arquitectura

El sistema **S.I-Copernico-Academy** es una plataforma educativa basada en la arquitectura **MERN Stack** (MongoDB, Express.js, React, Node.js). Esta arquitectura permite un desarrollo unificado en JavaScript (backend y frontend) y escalabilidad mediante microservicios o contenedores si fuera necesario.

### Componentes Principales

1.  **Cliente (Frontend)**: SPA (Single Page Application) desarrollada con React y Vite. Utiliza `react-router-dom` para la navegación y `axios` para la comunicación HTTP.
2.  **Servidor (Backend)**: API RESTful desarrollada con Express.js. Maneja la lógica de negocio, validaciones y conexión a datos.
3.  **Datos (Database)**: MongoDB gestionado a través de Mongoose ODM para modelado de esquemas estrictos.

---

## 2. Modelado de Datos (MongoDB Schemas)

La base de datos se estructura en torno a las siguientes colecciones principales (definidas en `src/models/`):

| Modelo                  | Descripción                                                      | Relaciones Clave                           |
| :---------------------- | :--------------------------------------------------------------- | :----------------------------------------- |
| **User**                | Entidad central de autenticación (Estudiantes, Tutores, Admins). | 1:N con Courses, Reports.                  |
| **Course**              | Cursos académicos disponibles en la plataforma.                  | 1:N con Students (Enrollments), Materials. |
| **Student**             | Perfil específico para estudiantes (extiende User o se vincula). | N:N con Courses.                           |
| **EducationalMaterial** | Recursos (PDFs, Links) asignados a cursos.                       | Pertenece a Course.                        |
| **Assignment**          | Tareas asignadas a los estudiantes.                              | Pertenece a Course.                        |
| **ClassVideo**          | Grabaciones o enlaces a clases en vivo.                          | Pertenece a Course.                        |
| **AvailabilitySlot**    | Franjas horarias disponibles para tutorías.                      | Vinculado a Tutor (User).                  |
| **Appointment**         | Citas de tutoría agendadas.                                      | Vincula Student y Tutor.                   |
| **ActivityLog**         | Registro de acciones para auditoría.                             | Vinculado a User.                          |
| **Notification**        | Alertas del sistema para usuarios.                               | Vinculado a User.                          |
| **Report**              | Informes de rendimiento o incidencias.                           | Generado por Admin/Tutor.                  |
| **VideoProgress**       | Rastreo de avance en visualización de videos.                    | Vincula Student y ClassVideo.              |
| **ProgressTracking**    | Métricas generales de progreso del estudiante.                   | Vincula Student y Course.                  |
| **Note**                | Notas personales de los estudiantes sobre cursos.                | Vinculado a User y Course.                 |

---

## 3. Catálogo de Servicios (API Endpoints)

El backend expone endpoints bajo el prefijo `/api`. Las rutas están separadas por dominio funcional en `src/routes/`.

| Dominio            | Ruta Base             | Funcionalidades                                       |
| :----------------- | :-------------------- | :---------------------------------------------------- |
| **Autenticación**  | `/api/auth`           | Login, Registro, Logout, Verify Token.                |
| **Usuarios**       | `/api/users`          | CRUD de usuarios, cambio de perfil, gestión de roles. |
| **Cursos**         | `/api/courses`        | Crear, listar, actualizar y eliminar cursos.          |
| **Materiales**     | `/api/edu-material`   | Subida y gestión de archivos/recursos.                |
| **Tareas**         | `/api/assignments`    | Asignación y entrega de tareas.                       |
| **Videos**         | `/api/class-videos`   | Gestión de enlaces de video de clases.                |
| **Citas/Agenda**   | `/api/appointments`   | Reservar, cancelar y listar tutorías.                 |
| **Disponibilidad** | `/api/availability`   | Gestión de horarios de tutores.                       |
| **Notas**          | `/api/notes`          | CRUD de notas personales.                             |
| **Notificaciones** | `/api/notifications`  | Leer y borrar notificaciones.                         |
| **Progreso**       | `/api/progress`       | Actualizar y consultar métricas de avance.            |
| **Video Progreso** | `/api/video-progress` | Marcar videos como vistos/parciales.                  |
| **Reportes**       | `/api/reports`        | Generación de reportes administrativos.               |

---

## 4. Estructura del Frontend (`client/`)

El cliente no sigue una estructura tradicional de "pages", sino que orquesta la vista a través de componentes en `App.jsx` y `client/src/components/`.

### Enrutamiento y Roles (`App.jsx`)

El archivo `App.jsx` define las rutas y protege el acceso mediante el componente `ProtectedRoute`.

- **Rutas Públicas**: `/`, `/home`, `/login`, `/signup`, `/forgot-password`.
- **Rutas Privadas (`/dashboard`)**:
  - **Vista Estudiante**: `StudentHome` (default), `MyCourses`, `VideosList`, `Tutors`, `NotesList`, `UserProfile`.
  - **Vista Tutor**: `TutorHome`, `TutorCourses`, `TutorStudents`, `TutorAgenda`, `TutorVideos`, `TutorProfile`.

### Componentes Clave

- **Layout**: `Navigation`, `SidebarMenu` (Menú lateral dinámico).
- **Gestión de Cursos**: `MyCourses.jsx` (Estudiante), `TutorCourses.jsx` (Tutor).
- **Multimedia**: `VideosList.jsx` (Lista de clases), `VideoProgressDashboard.jsx` (Métricas de video).
- **Interacción**: `Tutors.jsx` (Búsqueda de tutores), `CreateUser.jsx` (Registro).

---

## 5. Decisiones Técnicas Relevantes

- **Validación de Datos**: Se utiliza `zod` en el backend para validar los cuerpos de las peticiones (schemas) antes de procesarlos.
- **Manejo de Archivos**: `multer` gestiona la subida de archivos (imágenes, PDFs) al directorio `uploads/`.
- **Seguridad**:
  - `bcryptjs` para hashing de contraseñas.
  - `jsonwebtoken` para manejo de sesiones stateless.
  - `helmet` y `cors` para seguridad de cabeceras HTTP.

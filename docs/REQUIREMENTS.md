# Documentación de Requerimientos - Copernico Academy

## 1. Requisitos de Hardware

### Servidor (Mínimo recomendado)
- **Procesador:** 2 vCPU o superior.
- **Memoria RAM:** 4 GB (8 GB recomendado para mejor rendimiento con Docker).
- **Almacenamiento:** Mínimo 10 GB de espacio libre en disco para imágenes Docker y base de datos.

### Cliente (Usuario Final)
- **Dispositivo:** Computadora de escritorio, laptop o tablet.
- **Conexión a Internet:** Estable, banda ancha recomendada.
- **Navegador Web:** Google Chrome, Mozilla Firefox, Microsoft Edge o Safari (versiones actualizadas).

## 2. Requisitos de Software

### Entorno de Desarrollo
- **Sistema Operativo:**
  - **Windows:** Windows 10 o 11 (64-bits).
  - **macOS:** macOS Catalina (10.15) o superior.
  - **Linux:** Distros modernas (64-bits) con soporte para Node.js 18+.
    - Ubuntu 20.04 LTS o superior.
    - Debian 11 (Bullseye) o superior.
    - Fedora 36 o superior.
    - CentOS Stream 9 / RHEL 9.
    - Arch Linux (Actualizado).
- **Runtime:** Node.js v18.0.0 o superior.
- **Gestor de Paquetes:** NPM v9.0.0 o superior (o PNPM/Yarn equivalentes).
- **Contenedores (Opcional):** Docker Desktop v4.0+ y Docker Compose v2.0+.

### Dependencias del Backend (Server)
Las principales librerías utilizadas son:
- `express` (^4.18.2): Framework web.
- `mongoose` (^6.8.3): ODM para MongoDB.
- `jsonwebtoken` (^9.0.0): Manejo de sesiones.
- `bcryptjs` (^2.4.3): Seguridad y hashing.
- `zod` (^3.20.2): Validación de datos.
- `cors`, `helmet`, `morgan`: utilidades de seguridad y logging.
- `multer`: Manejo de subida de archivos.

### Dependencias del Frontend (Client)
- `react` (^18.2.0): Biblioteca UI.
- `vite` (^3.2.3): Build tool.
- `react-router-dom`: Navegación SPA.
- `axios`: Peticiones HTTP.
- `bootswatch` / `tailwindcss`: Estilizado de la interfaz.

## 3. Requisitos Funcionales del Sistema

1. **Autenticación:** El sistema debe permitir registro, login y logout seguro, con diferenciación de roles (Estudiante, Tutor, Admin).
2. **Gestión de Perfiles:** Los usuarios deben poder ver y editar su información personal.
3. **Agenda:** Capacidad de crear, visualizar y gestionar citas y horarios disponibles.
4. **Repositorio:** Subida y descarga de materiales educativos soportando diversos formatos.
5. **Seguimiento:** Registro y visualización del progreso del estudiante a través de reportes y estadísticas.
6. **Seguridad:** Los endpoints sensibles deben estar protegidos por autenticación JWT.

## 4. Requisitos No Funcionales

1. **Escalabilidad:** Arquitectura preparada para escalar horizontalmente mediante contenedores.
2. **Disponibilidad:** Base de datos persistente resistente a fallos de contenedor (volúmenes Docker).
3. **Mantenibilidad:** Código modular separado en rutas, controladores y servicios.
4. **Interoperabilidad:** API REST estándar consumible por cualquier cliente HTTP (Web, Móvil).

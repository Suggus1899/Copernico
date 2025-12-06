# 🎓 Copernico Academy - Sistema de Tutorías y Asesoramiento Académico

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.8-green.svg)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

Sistema completo de gestión académica desarrollado con el stack **MERN** (MongoDB, Express, React, Node.js). Plataforma para tutorías, asesoramiento académico, gestión de materiales educativos, seguimiento de progreso y reportes académicos.

---

## 📑 Tabla de Contenidos

1. [Descripción del Proyecto](#-descripción-del-proyecto)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Stack Tecnológico](#-stack-tecnológico)
4. [Estructura del Proyecto](#-estructura-del-proyecto)
5. [Instalación y Configuración](#-instalación-y-configuración)
6. [Despliegue con Docker](#-despliegue-con-docker)
7. [Desarrollo Local](#-desarrollo-local)
8. [Configuración de MongoDB](#-configuración-de-mongodb)
9. [API y Endpoints](#-api-y-endpoints)
10. [Autenticación y Seguridad](#-autenticación-y-seguridad)
11. [Guía de Desarrollo](#-guía-de-desarrollo)
12. [Troubleshooting](#-troubleshooting)

---

## 🎯 Descripción del Proyecto

**Copernico Academy** es un sistema integral de apoyo académico que permite:

- **Gestión de Usuarios**: Estudiantes, tutores, asesores y administradores con perfiles especializados
- **Sistema de Citas**: Reserva y gestión de tutorías y asesorías
- **Materiales Educativos**: Biblioteca de recursos académicos con calificaciones y descargas
- **Tareas y Asignaciones**: Sistema de tareas con seguimiento de entregas y calificaciones
- **Seguimiento de Progreso**: Monitoreo del avance académico de estudiantes
- **Reportes Académicos**: Generación y entrega de reportes de progreso
- **Notificaciones**: Sistema de notificaciones en tiempo real
- **Disponibilidad**: Gestión de horarios de tutores y asesores

### Estado Actual del Proyecto

✅ **Implementado:**
- API REST completa con 8 colecciones principales
- Autenticación JWT con roles y permisos
- Validación de datos con Zod
- Frontend React con Vite
- Hot-reload en desarrollo
- Configuración Docker completa
- Middleware de autenticación y autorización
- Sistema de roles (student, tutor, advisor, admin)

🚧 **En Desarrollo:**
- Tests automatizados
- Integración continua (CI/CD)
- Panel administrativo completo
- Sistema de pagos (opcional)

---

## 🏗️ Arquitectura del Sistema

### Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Login   │  │ Dashboard│  │ Materials│  │ Profile  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│         │              │             │              │        │
│         └──────────────┴─────────────┴──────────────┘        │
│                            │                                  │
│                    HTTP/REST API                              │
└────────────────────────────┼──────────────────────────────────┘
                             │
┌────────────────────────────┼──────────────────────────────────┐
│                    BACKEND (Express)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Routes      │  │ Controllers  │  │ Middlewares │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │              │             │                         │
│         └──────────────┴─────────────┘                        │
│                            │                                  │
│                    Mongoose ODM                               │
└────────────────────────────┼──────────────────────────────────┘
                             │
┌────────────────────────────┼──────────────────────────────────┐
│                    DATABASE (MongoDB)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  Users   │  │Appointments│ │Materials │  │Progress │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└───────────────────────────────────────────────────────────────┘
```

### Patrón de Arquitectura

El proyecto sigue el patrón **MVC (Model-View-Controller)** adaptado para API REST:

- **Models** (`src/models/`): Esquemas Mongoose que definen la estructura de datos
- **Views**: Componentes React en `client/src/components/`
- **Controllers** (`src/controllers/`): Lógica de negocio y manejo de peticiones HTTP
- **Routes** (`src/routes/`): Definición de endpoints y montaje de middlewares
- **Middlewares** (`src/middlewares/`): Autenticación, validación, autorización

### Flujo de Petición

```
Cliente → Express App → Middlewares → Routes → Controllers → Models → MongoDB
         (CORS)      (Auth/Validation)        (Business Logic)  (Data Access)
```

---

## 💻 Stack Tecnológico

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Node.js** | 18+ | Runtime de JavaScript |
| **Express** | 4.18.2 | Framework web |
| **MongoDB** | 6.8.3 | Base de datos NoSQL |
| **Mongoose** | 6.8.3 | ODM para MongoDB |
| **JWT** | 9.0.0 | Autenticación basada en tokens |
| **bcryptjs** | 2.4.3 | Hash de contraseñas |
| **Zod** | 3.20.2 | Validación de esquemas |
| **dotenv** | 16.0.3 | Variables de entorno |
| **morgan** | 1.10.0 | Logger HTTP |
| **cors** | 2.8.5 | Configuración CORS |

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 18.2.0 | Biblioteca UI |
| **Vite** | 3.2.3 | Build tool y dev server |
| **React Router** | 6.4.4 | Enrutamiento |
| **Axios** | 1.2.0 | Cliente HTTP |
| **Bootswatch** | 5.2.2 | Temas CSS |

### DevOps

| Tecnología | Propósito |
|------------|-----------|
| **Docker** | Containerización |
| **Docker Compose** | Orquestación de servicios |
| **Nodemon** | Hot-reload en desarrollo |

---

## 📁 Estructura del Proyecto

```
copernico-academy/
│
├── src/                          # Backend (Express)
│   ├── app.js                    # Configuración de Express, middlewares, rutas
│   ├── index.js                  # Punto de entrada, conexión a MongoDB
│   ├── config.js                 # Variables de entorno y configuración
│   ├── database.js               # Conexión a MongoDB con manejo de errores
│   │
│   ├── controllers/              # Lógica de negocio
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── appointment.controller.js
│   │   ├── educationalMaterial.controller.js
│   │   ├── assignment.controller.js
│   │   ├── progressTracking.controller.js
│   │   ├── report.controller.js
│   │   ├── notification.controller.js
│   │   └── availability.controller.js
│   │
│   ├── models/                   # Esquemas Mongoose
│   │   ├── User.js
│   │   ├── Appointment.js
│   │   ├── EducationalMaterial.js
│   │   ├── Assignment.js
│   │   ├── ProgressTracking.js
│   │   ├── Report.js
│   │   ├── Notification.js
│   │   └── AvailabilitySlot.js
│   │
│   ├── routes/                   # Definición de endpoints
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── appointment.routes.js
│   │   └── ...
│   │
│   ├── middlewares/              # Middlewares personalizados
│   │   ├── auth.middleware.js    # Autenticación JWT
│   │   ├── role.middleware.js    # Autorización por roles
│   │   └── schemaValidator.js    # Validación con Zod
│   │
│   └── schemas/                  # Esquemas de validación Zod
│       ├── auth.schema.js
│       ├── user.schema.js
│       └── ...
│
├── client/                       # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/           # Componentes React
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UserProfile.jsx
│   │   │   └── ...
│   │   ├── utils/
│   │   │   └── axiosConfig.js    # Configuración de Axios con interceptors
│   │   ├── App.jsx                # Componente raíz
│   │   └── main.jsx              # Punto de entrada
│   ├── public/                   # Archivos estáticos
│   ├── index.html
│   └── vite.config.js            # Configuración de Vite
│
├── docker-compose.yml            # Orquestación de servicios Docker
├── Dockerfile                     # Imagen de producción
├── Dockerfile.dev                 # Imagen de desarrollo (backend)
├── .dockerignore                  # Archivos excluidos del build
├── .env.example                   # Plantilla de variables de entorno
├── package.json                   # Dependencias del backend
└── README.md                      # Este archivo
```

### Descripción Detallada de Directorios

#### `src/controllers/`
Contiene la lógica de negocio. Cada controlador maneja las operaciones CRUD y lógica específica de su entidad.

**Patrón de Controlador:**
```javascript
export const createEntity = async (req, res, next) => {
  try {
    // Validación de datos (ya validado por middleware)
    // Lógica de negocio
    const entity = await Model.create(req.body);
    return res.status(201).json({
      success: true,
      data: entity
    });
  } catch (error) {
    next(error); // Pasa al middleware de manejo de errores
  }
};
```

#### `src/models/`
Esquemas Mongoose que definen la estructura de datos, validaciones a nivel de base de datos, índices y métodos personalizados.

**Características:**
- Validación de campos requeridos
- Índices para optimización de consultas
- Hooks pre/post (ej: hash de contraseñas)
- Métodos de instancia (ej: `comparePassword`)

#### `src/routes/`
Define los endpoints HTTP y monta los middlewares necesarios (autenticación, validación, autorización).

**Estructura típica:**
```javascript
router.use(authenticateToken); // Todas las rutas requieren autenticación
router.get('/', controller.getAll);
router.post('/', requireRole(['admin']), validator, controller.create);
```

#### `src/middlewares/`
- **auth.middleware.js**: Verifica tokens JWT, valida usuario activo
- **role.middleware.js**: Verifica permisos por rol
- **schemaValidator.js**: Valida request body/query con Zod

#### `src/schemas/`
Esquemas Zod para validación de entrada. Validan tipos, rangos, formatos y relaciones entre campos.

---

## 🚀 Instalación y Configuración

### Requisitos Previos

- **Node.js**: v18 o superior ([Descargar](https://nodejs.org/))
- **npm**: v9 o superior (incluido con Node.js)
- **MongoDB**: Local o MongoDB Atlas ([Ver configuración](#-configuración-de-mongodb))
- **Docker Desktop** (opcional, para desarrollo con Docker)

### Instalación Rápida

#### Opción 1: Desarrollo Local (Sin Docker)

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd S.I-Copernico-Academy

# 2. Instalar dependencias del backend
npm install

# 3. Instalar dependencias del frontend
cd client
npm install
cd ..

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# 5. Iniciar MongoDB (local o usar Atlas)

# 6. Iniciar backend (terminal 1)
npm run dev

# 7. Iniciar frontend (terminal 2)
cd client
npm run dev
```

#### Opción 2: Con Docker (Recomendado)

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd S.I-Copernico-Academy

# 2. Configurar variables de entorno (opcional)
cp .env.example .env
# Editar .env si necesitas personalizar

# 3. Ejecutar todo con Docker Compose
docker compose up -d --build

# 4. Esperar 30-60 segundos y acceder a:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:4000
```

---

## 🐳 Despliegue con Docker

### Arquitectura Docker

El proyecto utiliza **Docker Compose** para orquestar tres servicios:

```
┌─────────────────────────────────────────┐
│      Docker Compose Network              │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │   db      │  │   api    │  │ client ││
│  │ (MongoDB) │  │ (Express)│  │ (Vite) ││
│  │ :27017    │  │ :4000    │  │ :5173  ││
│  └──────────┘  └──────────┘  └────────┘│
│       │            │             │       │
│       └────────────┴─────────────┘       │
│            copernico-network             │
└─────────────────────────────────────────┘
```

### Comandos Docker

#### Iniciar el Proyecto

```bash
# Construir imágenes e iniciar servicios
docker compose up -d --build

# Ver estado de los contenedores
docker compose ps

# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f api      # Backend
docker compose logs -f client   # Frontend
docker compose logs -f db       # MongoDB
```

#### Gestión de Servicios

```bash
# Detener todos los servicios
docker compose down

# Detener y eliminar volúmenes (incluye datos de MongoDB)
docker compose down -v

# Reiniciar un servicio específico
docker compose restart api
docker compose restart client

# Reconstruir después de cambios en dependencias
docker compose up -d --build
```

### Configuración de Volúmenes

Los volúmenes están configurados para **hot-reload** en desarrollo:

**Backend:**
- `./src` → `/app/src` (código fuente)
- `./package.json` → `/app/package.json`
- `/app/node_modules` (excluido, usa los del contenedor)

**Frontend:**
- `./client/src` → `/app/src`
- `./client/public` → `/app/public`
- `/app/node_modules` (excluido)

**MongoDB:**
- `mongodb_data` (volumen persistente para datos)

### Variables de Entorno en Docker

Las variables se configuran en `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=development
  - PORT=4000
  - MONGODB_URI=mongodb://db:27017/merndatabase
  - JWT_SECRET=${JWT_SECRET:-default-secret}
  - FRONTEND_URL=http://localhost:5173
  # Frontend (Vite) consumiendo la API desde el navegador (host)
  - VITE_API_URL=http://localhost:4000/api
```

**Nota**: `db` es el nombre del servicio MongoDB en la red Docker.

### Hot-Reload en Docker

El hot-reload funciona automáticamente:

- **Backend**: Nodemon detecta cambios en `src/`
- **Frontend**: Vite HMR detecta cambios en `client/src/`

Si no funciona:
```bash
# Verificar montaje de volúmenes
docker compose exec api ls -la /app/src
docker compose exec client ls -la /app/src

# Reiniciar servicios
docker compose restart api client
```

### Producción con Docker

Para producción, usa el `Dockerfile` principal (no `Dockerfile.dev`):

```bash
# Construir imagen de producción
docker build -t copernico-academy:latest .

# Ejecutar contenedor
docker run -d \
  -p 4000:4000 \
  --env-file .env.production \
  --name copernico-prod \
  copernico-academy:latest
```

El `Dockerfile` de producción:
1. Construye el frontend (Vite build)
2. Instala solo dependencias de producción
3. Sirve el frontend desde Express
4. Optimiza la imagen (multi-stage build)

---

## 💻 Desarrollo Local

### Configuración Inicial

#### 1. Variables de Entorno

Crea un archivo `.env` en la raíz:

```env
# Backend
PORT=4000
NODE_ENV=development

# MongoDB (local)
MONGODB_URI=mongodb://localhost:27017/merndatabase

# MongoDB (Atlas) - descomenta y configura
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/merndatabase

# JWT Secret (¡CAMBIA EN PRODUCCIÓN!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# CORS
FRONTEND_URL=http://localhost:5173

# Frontend (Vite) - URL de la API en local
VITE_API_URL=http://localhost:4000/api
```

#### 2. Instalación de Dependencias

```bash
# Backend
npm install

# Frontend
cd client
npm install
cd ..
```

### Scripts Disponibles

#### Backend (`package.json`)

```json
{
  "dev": "nodemon --exec \"node --max-old-space-size=4096 src/index.js\" --ignore client",
  "debug": "node --inspect src/index.js"
}
```

**Uso:**
```bash
npm run dev      # Desarrollo con hot-reload
npm run debug    # Modo debug con inspector
```

#### Frontend (`client/package.json`)

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

**Uso:**
```bash
cd client
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
```

### Estructura de Desarrollo

```
Terminal 1 (Backend):
$ npm run dev
> Server on port 4000
> ✅ MongoDB Connected: localhost

Terminal 2 (Frontend):
$ cd client && npm run dev
> VITE v3.2.3  ready in 500 ms
> ➜  Local:   http://localhost:5173/
```

### Hot-Reload

- **Backend**: Nodemon reinicia automáticamente al detectar cambios
- **Frontend**: Vite HMR actualiza sin recargar la página

---

## 🗄️ Configuración de MongoDB

### Opción 1: MongoDB Atlas (Recomendado - Gratis)

#### Paso 1: Crear Cuenta
1. Ve a https://www.mongodb.com/cloud/atlas/register
2. Crea cuenta gratuita (M0 - Free Tier)

#### Paso 2: Crear Cluster
1. Click en **"Build a Database"**
2. Selecciona **FREE (M0)**
3. Elige región cercana
4. Click **"Create"** (espera 1-3 minutos)

#### Paso 3: Configurar Acceso
1. **Database User**: Crea usuario y contraseña
2. **Network Access**: Agrega `0.0.0.0/0` (o tu IP específica)

#### Paso 4: Obtener Connection String
1. Click **"Connect"** → **"Connect your application"**
2. Copia la URI:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. Agrega nombre de base de datos:
   ```
   mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/merndatabase?retryWrites=true&w=majority
   ```

#### Paso 5: Configurar en `.env`
```env
MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/merndatabase?retryWrites=true&w=majority
```

### Opción 2: MongoDB Local

#### Windows
1. Descarga: https://www.mongodb.com/try/download/community
2. Instala MongoDB Community Server
3. Se inicia automáticamente como servicio

#### Verificar Instalación
```powershell
# Verificar servicio
Get-Service -Name MongoDB

# Verificar puerto
netstat -ano | findstr :27017
```

#### Configuración en `.env`
```env
MONGODB_URI=mongodb://localhost:27017/merndatabase
```

### Opción 3: MongoDB con Docker

Si usas Docker Compose, MongoDB se configura automáticamente:

```yaml
db:
  image: mongo:latest
  ports:
    - "27017:27017"
  volumes:
    - mongodb_data:/data/db
```

Connection string en Docker:
```env
MONGODB_URI=mongodb://db:27017/merndatabase
```

---

## 🔌 API y Endpoints

### Base URL

```
http://localhost:4000/api
```

### Autenticación

Todas las rutas protegidas requieren un token JWT en el header:

```
Authorization: Bearer <token>
```

O alternativamente:
```
auth-token: <token>
```

### Endpoints Principales

#### Autenticación (`/api/auth`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/signup` | Registrar nuevo usuario | ❌ |
| POST | `/api/auth/signin` | Iniciar sesión | ❌ |
| GET | `/api/auth/profile` | Obtener perfil del usuario | ✅ |

**Ejemplo de Signup:**
```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "role": "student",
    "personalInfo": {
      "firstName": "Juan",
      "lastName": "Pérez"
    }
  }'
```

**Ejemplo de Signin:**
```bash
curl -X POST http://localhost:4000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "role": "student"
  }
}
```

#### Usuarios (`/api/users`)

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/users` | Listar usuarios | admin, tutor, advisor |
| GET | `/api/users/:id` | Obtener usuario | admin, tutor, advisor |
| GET | `/api/users/profile` | Perfil propio | ✅ Todos |
| POST | `/api/users` | Crear usuario | admin |
| PUT | `/api/users/:id` | Actualizar usuario | Propio o admin |
| DELETE | `/api/users/:id` | Eliminar usuario | admin |

#### Citas (`/api/appointments`)

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/appointments` | Listar citas | ✅ Todos |
| GET | `/api/appointments/upcoming` | Citas próximas | ✅ Todos |
| GET | `/api/appointments/:id` | Obtener cita | ✅ Todos |
| POST | `/api/appointments` | Crear cita | student, admin |
| PUT | `/api/appointments/:id` | Actualizar cita | student, tutor, advisor, admin |
| PATCH | `/api/appointments/:id/cancel` | Cancelar cita | ✅ Todos |
| POST | `/api/appointments/:id/notes` | Agregar nota | tutor, advisor, admin |
| POST | `/api/appointments/:id/rate` | Calificar cita | ✅ Todos |

#### Materiales Educativos (`/api/materials`)

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/materials` | Listar materiales | ✅ Todos |
| GET | `/api/materials/popular` | Materiales populares | ✅ Todos |
| GET | `/api/materials/my/materials` | Mis materiales | tutor, advisor, admin |
| GET | `/api/materials/:id` | Obtener material | ✅ Todos |
| POST | `/api/materials` | Crear material | tutor, advisor, admin |
| PUT | `/api/materials/:id` | Actualizar material | tutor, advisor, admin |
| DELETE | `/api/materials/:id` | Eliminar material | tutor, advisor, admin |
| POST | `/api/materials/:id/rate` | Calificar material | ✅ Todos |
| PATCH | `/api/materials/:id/download` | Incrementar descargas | ✅ Todos |

#### Tareas (`/api/assignments`)

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/assignments` | Listar tareas | ✅ Todos |
| GET | `/api/assignments/my-assignments` | Mis tareas | student |
| GET | `/api/assignments/pending` | Tareas pendientes | student |
| GET | `/api/assignments/:id` | Obtener tarea | ✅ Todos |
| POST | `/api/assignments` | Crear tarea | tutor, advisor, admin |
| PUT | `/api/assignments/:id` | Actualizar tarea | tutor, advisor, admin |
| POST | `/api/assignments/:id/submit` | Entregar tarea | student |
| POST | `/api/assignments/:id/grade` | Calificar tarea | tutor, advisor, admin |

#### Progreso (`/api/progress`)

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/progress` | Listar progresos | ✅ Todos |
| GET | `/api/progress/my-progress` | Mi progreso | student |
| GET | `/api/progress/student-progress` | Progreso de estudiante | tutor, advisor, admin |
| GET | `/api/progress/statistics` | Estadísticas | ✅ Todos |
| POST | `/api/progress` | Crear registro | tutor, advisor, admin |
| PUT | `/api/progress/:id` | Actualizar progreso | tutor, advisor, admin |

#### Reportes (`/api/reports`)

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/reports` | Listar reportes | ✅ Todos |
| GET | `/api/reports/templates` | Plantillas | ✅ Todos |
| GET | `/api/reports/:id` | Obtener reporte | ✅ Todos |
| POST | `/api/reports` | Crear reporte | tutor, advisor, admin |
| POST | `/api/reports/:id/generate` | Generar reporte | tutor, advisor, admin |
| POST | `/api/reports/:id/deliver` | Entregar reporte | tutor, advisor, admin |

#### Notificaciones (`/api/notifications`)

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/notifications` | Listar notificaciones | ✅ Todos |
| GET | `/api/notifications/unread-count` | Contador no leídas | ✅ Todos |
| GET | `/api/notifications/stats` | Estadísticas | ✅ Todos |
| GET | `/api/notifications/:id` | Obtener notificación | ✅ Todos |
| PATCH | `/api/notifications/:id/read` | Marcar como leída | ✅ Todos |
| PATCH | `/api/notifications/read-all` | Marcar todas como leídas | ✅ Todos |
| POST | `/api/notifications/:id/respond` | Responder notificación | ✅ Todos |

#### Disponibilidad (`/api/availability`)

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/availability` | Listar slots | tutor, advisor, admin |
| GET | `/api/availability/available` | Slots disponibles | ✅ Todos |
| GET | `/api/availability/my-slots` | Mis slots | tutor, advisor |
| GET | `/api/availability/:id` | Obtener slot | tutor, advisor, admin |
| POST | `/api/availability` | Crear slot | tutor, advisor |
| PUT | `/api/availability/:id` | Actualizar slot | Propio o admin |
| DELETE | `/api/availability/:id` | Eliminar slot | Propio o admin |

### Health Check

```bash
GET /api/health
```

**Respuesta:**
```json
{
  "success": true,
  "message": "S.I-COPERNICO-ACADEMY API is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "collections": [
    "users",
    "availability_slots",
    "appointments",
    "educational_materials",
    "assignments",
    "progress_tracking",
    "reports",
    "notifications"
  ]
}
```

---

## 🔐 Autenticación y Seguridad

### Sistema de Autenticación JWT

El proyecto utiliza **JSON Web Tokens (JWT)** para autenticación stateless.

#### Flujo de Autenticación

```
1. Cliente → POST /api/auth/signin
   { email, password }

2. Servidor → Valida credenciales
   → Genera JWT token
   → Responde con token

3. Cliente → Almacena token (localStorage)
   → Incluye en headers: Authorization: Bearer <token>

4. Servidor → Middleware authenticateToken
   → Verifica token
   → Extrae información del usuario
   → Agrega req.user a la petición
```

#### Estructura del Token

```javascript
{
  _id: "user_id",
  iat: timestamp,
  exp: timestamp
}
```

#### Middleware de Autenticación

**Ubicación**: `src/middlewares/auth.middleware.js`

**Funcionalidades:**
- Extrae token de headers (`Authorization: Bearer` o `auth-token`)
- Verifica firma y expiración del token
- Valida que el usuario exista en la base de datos
- Verifica estado del usuario (activo, suspendido, bloqueado)
- Agrega información del usuario a `req.user`

**Uso:**
```javascript
import { authenticateToken } from '../middlewares/auth.middleware.js';

router.use(authenticateToken); // Protege todas las rutas
```

#### Sistema de Roles

**Roles disponibles:**
- `student`: Estudiante
- `tutor`: Tutor
- `advisor`: Asesor académico
- `admin`: Administrador

**Middleware de Autorización:**
```javascript
import { requireRole } from '../middlewares/role.middleware.js';

router.post('/', requireRole(['admin', 'tutor']), controller.create);
```

#### Seguridad de Contraseñas

- **Hash**: bcryptjs con 10 salt rounds
- **Almacenamiento**: Campo `password` con `select: false` (no se incluye en queries por defecto)
- **Comparación**: Método `comparePassword()` en el modelo User

#### Protección contra Ataques

1. **Brute Force**: Bloqueo temporal después de 5 intentos fallidos (30 minutos)
2. **Token Expiration**: Tokens JWT con expiración (configurable)
3. **CORS**: Configurado para permitir solo origen específico
4. **Input Validation**: Validación con Zod en todos los endpoints
5. **SQL Injection**: Prevenido por Mongoose (NoSQL injection protection)

#### Variables de Seguridad

```env
JWT_SECRET=your-super-secret-key-min-32-characters
```

**⚠️ IMPORTANTE**: En producción:
- Usa una clave secreta fuerte (mínimo 32 caracteres)
- No commitees el archivo `.env`
- Rota las claves periódicamente
- Usa variables de entorno del servidor

---

## 👨‍💻 Guía de Desarrollo

### Agregar una Nueva Entidad/API

#### Paso 1: Crear Modelo

`src/models/NewEntity.js`:
```javascript
import mongoose from 'mongoose';

const newEntitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('NewEntity', newEntitySchema);
```

#### Paso 2: Crear Esquema de Validación

`src/schemas/newEntity.schema.js`:
```javascript
import { z } from 'zod';

export const createNewEntitySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional()
  })
});
```

#### Paso 3: Crear Controlador

`src/controllers/newEntity.controller.js`:
```javascript
import NewEntity from '../models/NewEntity.js';

export const createNewEntity = async (req, res, next) => {
  try {
    const entity = await NewEntity.create({
      ...req.body,
      createdBy: req.user._id
    });
    return res.status(201).json({
      success: true,
      data: entity
    });
  } catch (error) {
    next(error);
  }
};

export const getNewEntities = async (req, res, next) => {
  try {
    const entities = await NewEntity.find()
      .populate('createdBy', 'personalInfo email');
    return res.json({
      success: true,
      data: entities
    });
  } catch (error) {
    next(error);
  }
};
```

#### Paso 4: Crear Rutas

`src/routes/newEntity.routes.js`:
```javascript
import { Router } from 'express';
import { createNewEntity, getNewEntities } from '../controllers/newEntity.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import { createNewEntitySchema } from '../schemas/newEntity.schema.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getNewEntities);
router.post('/', requireRole(['admin']), schemaValidator(createNewEntitySchema), createNewEntity);

export default router;
```

#### Paso 5: Registrar Rutas

`src/app.js`:
```javascript
import newEntityRoutes from './routes/newEntity.routes.js';

// ...

app.use('/api/new-entities', newEntityRoutes);
```

### Workflow de Git

#### Crear una Nueva Feature

```bash
# 1. Crear branch
git checkout -b feature/nueva-funcionalidad

# 2. Hacer cambios y commits
git add .
git commit -m "feat(api): add new entity endpoint"

# 3. Push y crear PR
git push -u origin feature/nueva-funcionalidad
```

#### Convención de Commits

Usa [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(api): add new entity endpoint
fix(auth): validate token expiry
docs(readme): update installation guide
refactor(controllers): simplify error handling
test(api): add integration tests
```

### Testing

#### Pruebas Manuales

```bash
# Health check
curl http://localhost:4000/api/health

# Login
curl -X POST http://localhost:4000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Endpoint protegido
curl http://localhost:4000/api/users/profile \
  -H "Authorization: Bearer <token>"
```

#### Pruebas con Postman

1. Importa la colección de endpoints
2. Configura variables de entorno:
   - `base_url`: http://localhost:4000/api
   - `token`: (se actualiza automáticamente después de login)
3. Ejecuta las requests

### Debugging

#### Backend

```bash

### Configuración Frontend

Para que el frontend (Vite) apunte correctamente a la API:

```bash
# Modo debug con inspector
npm run debug

# Conecta debugger en Chrome:
# chrome://inspect → Open dedicated DevTools
```

#### Frontend

En Docker Compose ya se define para el cliente:

```yaml

```bash
# React DevTools
# Instala extensión en Chrome/Firefox


Notas:
- Si cambias el puerto del backend, actualiza `VITE_API_URL` en el `.env` del cliente.
- En producción, configura la URL pública de la API en el entorno de build del frontend.
# Vite DevTools
# Abre DevTools del navegador
```

#### Logs

```javascript
// Backend usa morgan para logs HTTP
// Ver en consola o configurar archivo de log
```

---

## 🐛 Troubleshooting

### Problemas Comunes

#### 1. Error: "Cannot connect to MongoDB"

**Síntomas:**
```
❌ Error connecting to MongoDB: connect ECONNREFUSED
```

**Soluciones:**
- Verifica que MongoDB esté corriendo:
  ```bash
  # Local
  Get-Service -Name MongoDB
  
  # Docker
  docker compose ps db
  ```
- Verifica la URI en `.env`:
  ```env
  MONGODB_URI=mongodb://localhost:27017/merndatabase
  ```
- Para Docker, usa el nombre del servicio:
  ```env
  MONGODB_URI=mongodb://db:27017/merndatabase
  ```

#### 2. Error: "Port already in use"

**Síntomas:**
```
Error: listen EADDRINUSE: address already in use :::4000
```

**Soluciones:**
```bash
# Windows - encontrar proceso
netstat -ano | findstr :4000

# Matar proceso
taskkill /PID <pid> /F

# O cambiar puerto en .env
PORT=4001
```

#### 3. Error: "Token inválido" o "Unauthorized"

**Síntomas:**
```
401 Unauthorized
Token inválido
```

**Soluciones:**
- Verifica que el token esté en el header:
  ```
  Authorization: Bearer <token>
  ```
- Verifica que el token no haya expirado
- Verifica `JWT_SECRET` en `.env`
- Limpia localStorage y vuelve a iniciar sesión

#### 4. Hot-reload no funciona

**Síntomas:**
Cambios en código no se reflejan automáticamente

**Soluciones:**
```bash
# Verificar que nodemon esté corriendo (backend)
# Verificar que Vite esté corriendo (frontend)

# Reiniciar servicios
npm run dev

# Docker: verificar volúmenes
docker compose exec api ls -la /app/src
docker compose restart api
```

#### 5. Error: "Module not found"

**Síntomas:**
```
Error: Cannot find module 'express'
```

**Soluciones:**
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Docker: reconstruir
docker compose down
docker compose up -d --build
```

#### 6. CORS Error

**Síntomas:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Soluciones:**
- Verifica `FRONTEND_URL` en `.env`
- Verifica configuración CORS en `src/app.js`
- Para desarrollo, permite `http://localhost:5173`

#### 7. Error: "Validation failed"

**Síntomas:**
```
400 Bad Request
Validation error: email is required
```

**Soluciones:**
- Verifica el esquema Zod en `src/schemas/`
- Verifica que los datos enviados coincidan con el esquema
- Revisa los mensajes de error en la respuesta

### Comandos de Diagnóstico

```bash
# Verificar conexión a MongoDB
docker compose exec api node -e "require('mongoose').connect('mongodb://db:27017/merndatabase').then(() => console.log('OK')).catch(e => console.error(e))"

# Verificar variables de entorno
docker compose exec api env | grep MONGODB

# Ver logs detallados
docker compose logs --tail 100 -f api

# Verificar red Docker
docker network inspect copernico-academy_copernico-network

# Limpiar todo y empezar de nuevo
docker compose down -v
docker system prune -f
docker compose up -d --build
```

---

## 📚 Recursos Adicionales

### Documentación Oficial

- [Node.js](https://nodejs.org/docs/)
- [Express](https://expressjs.com/)
- [MongoDB](https://docs.mongodb.com/)
- [Mongoose](https://mongoosejs.com/docs/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Docker](https://docs.docker.com/)

### Comunidad

- [Stack Overflow](https://stackoverflow.com/questions/tagged/node.js)
- [MongoDB Community](https://community.mongodb.com/)
- [React Community](https://react.dev/community)

---

## 📝 Licencia

MIT License - Ver archivo `LICENSE` para más detalles.

---

## 👥 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📧 Contacto

Para preguntas o soporte, abre un issue en el repositorio.

---

**Última actualización**: Enero 2024

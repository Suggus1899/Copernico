<div align="center">

# 🎓 Copérnico Academy

### Plataforma de tutorías y asesoramiento académico

Reserva citas con tutores, sigue cursos con vídeos de YouTube y gestiona documentos, notas, mensajes y notificaciones desde un único lugar.

</div>

---

## 🛠️ Tech Stack

La API y el cliente usan TypeScript con comprobación estricta de tipos. La API conserva Express y Mongoose; el cliente conserva React y Vite. En producción, Node.js 24 ejecuta el JavaScript compilado en `dist/`.

<table align="center">
  <tr>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/nodedotjs/339933" width="48" height="48" alt="Node.js" /><br/>
      <sub><b>Node.js 24</b></sub><br/>
      <sub>Runtime</sub>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/express/555555" width="48" height="48" alt="Express" /><br/>
      <sub><b>Express 4</b></sub><br/>
      <sub>API REST</sub>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/mongodb/47A248" width="48" height="48" alt="MongoDB" /><br/>
      <sub><b>MongoDB</b></sub><br/>
      <sub>Replica set</sub>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/mongoose/880000" width="48" height="48" alt="Mongoose" /><br/>
      <sub><b>Mongoose 8</b></sub><br/>
      <sub>ODM</sub>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/zod/3E67B1" width="48" height="48" alt="Zod" /><br/>
      <sub><b>Zod</b></sub><br/>
      <sub>Validación</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/react/61DAFB" width="48" height="48" alt="React" /><br/>
      <sub><b>React 18</b></sub><br/>
      <sub>Interfaz</sub>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/vite/646CFF" width="48" height="48" alt="Vite" /><br/>
      <sub><b>Vite 6</b></sub><br/>
      <sub>Build y dev server</sub>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/reactrouter/CA4245" width="48" height="48" alt="React Router" /><br/>
      <sub><b>React Router</b></sub><br/>
      <sub>Rutas</sub>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/axios/5A29E4" width="48" height="48" alt="Axios" /><br/>
      <sub><b>Axios</b></sub><br/>
      <sub>Cliente HTTP</sub>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/bootstrap/7952B3" width="48" height="48" alt="Bootstrap" /><br/>
      <sub><b>Bootstrap</b></sub><br/>
      <sub>Tema Lux</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/jsonwebtokens/555555" width="48" height="48" alt="JWT" /><br/>
      <sub><b>JWT</b></sub><br/>
      <sub>Sesión en cookie</sub>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/supabase/3ECF8E" width="48" height="48" alt="Supabase" /><br/>
      <sub><b>Supabase</b></sub><br/>
      <sub>Archivos privados</sub>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/render/46E3B7" width="48" height="48" alt="Render" /><br/>
      <sub><b>Render</b></sub><br/>
      <sub>API en producción</sub>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/vercel/555555" width="48" height="48" alt="Vercel" /><br/>
      <sub><b>Vercel</b></sub><br/>
      <sub>Cliente en producción</sub>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/docker/2496ED" width="48" height="48" alt="Docker" /><br/>
      <sub><b>Docker</b></sub><br/>
      <sub>Entorno local</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/githubactions/2088FF" width="48" height="48" alt="GitHub Actions" /><br/>
      <sub><b>GitHub Actions</b></sub><br/>
      <sub>CI</sub>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.simpleicons.org/youtube/FF0000" width="48" height="48" alt="YouTube" /><br/>
      <sub><b>YouTube</b></sub><br/>
      <sub>Vídeos de lecciones</sub>
    </td>
  </tr>
</table>

## 📐 Arquitectura

```
+-------------------------------+
| Navegador (React + Vite)      |
+-------------------------------+
                |  HTTPS
                v
+-------------------------------+
| Vercel: cliente estatico      |
| reescribe /api/* hacia Render |
+-------------------------------+
                |  /api/* con cookie HttpOnly
                v
+-------------------------------+
| Render: API Express 4         |
| JWT, Zod, rate limits         |
+-------------------------------+
                |
        +-------+-------+
        |               |
        v               v
+--------------+  +-----------------+
| MongoDB      |  | Supabase        |
| replica set  |  | bucket privado  |
+--------------+  +-----------------+
```

## 📱 Aplicaciones

| Aplicación | Carpeta | Local | Producción |
|---|---|---|---|
| 🖥️ **API** | `src/` | `http://localhost:4002` | Render (`render.yaml`) |
| 🌐 **Cliente** | `client/` | `http://localhost:5173` | Vercel (`client/vercel.json`) |
| 🗄️ **Base de datos** | Docker o instalación local | `mongodb://127.0.0.1:27017` | MongoDB Atlas |

## 📦 Estructura del Proyecto

```
Copernico/
├── src/                        API: configuración, rutas, controladores, modelos, servicios
├── test/                       Tests de integración (node:test + MongoDB en memoria)
├── scripts/                    Migraciones de la versión anterior (ver DEPLOY.md)
├── client/                     Cliente React + Vite (vercel.json: build y reescritura /api)
├── .github/workflows/ci.yml    Tipos, tests, builds e imagen de producción
├── docker-compose.yml          Desarrollo local: MongoDB replica set, API y cliente
├── Dockerfile.dev              Imagen de desarrollo de la API
├── render.yaml                 Blueprint de Render para la API
├── .env.example                Plantilla de variables de entorno
├── DEPLOY.md                   Guía de despliegue en producción
└── LICENSE                     Apache License 2.0
```

## 🚀 Quick Start

### Requisitos

| Herramienta | Versión | Uso |
|---|---|---|
| Node.js | 24 (ver `.nvmrc`) | API y cliente |
| MongoDB | Replica set (local o Atlas) | Las citas usan transacciones |
| Docker | Opcional | `docker compose` |

### Opción A: Docker

```bash
docker compose up --build
```

- Cliente: http://localhost:5173
- API: http://localhost:4002/api/health

Para probar subidas de archivos, define `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en un `.env` en la raíz (Compose lo lee). Sin ellas, las subidas responden `503 STORAGE_NOT_CONFIGURED`.

### Opción B: sin Docker

```bash
cp .env.example .env          # en Windows: copy .env.example .env
npm ci
npm run dev                   # API en http://localhost:4002

cd client
npm ci
npm run dev                   # cliente en http://localhost:5173
```

Necesitas MongoDB con replica set: un `mongod --replSet rs0` local (con `rs.initiate()` una vez) o un cluster de Atlas. El cliente llama a `/api` y Vite lo reenvía a `API_PROXY_TARGET` (por defecto `http://localhost:4002`).

## ✨ Funcionalidades

| Área | Qué incluye |
|---|---|
| 👤 **Cuentas** | Registro de estudiantes y tutores con sesión por cookie HttpOnly. Cambiar contraseña o email y desactivar la cuenta invalidan las sesiones abiertas. |
| 📅 **Citas** | Reserva con un tutor para un curso publicado. El tutor confirma, rechaza o cancela, y se comprueban solapamientos. |
| 🎓 **Cursos** | La inscripción se crea al confirmar una cita. Las lecciones usan vídeos de YouTube y registran el progreso. |
| 💬 **Mensajes y notificaciones** | Mensajes entre estudiante y tutor (`/api/messages`) y notificaciones en la app (`/api/notifications`). |
| 📝 **Notas** | Notas de usuario (`/api/notes`). |
| 📁 **Archivos** | Documentos, avatares y materiales en Supabase Storage con bucket privado; descargas mediante enlaces firmados. |
| 🛡️ **Administración** | El rol `admin` puede enviar notificaciones manuales desde la API. Todavía no hay panel de administración en el cliente. |

## 📊 Reglas de Negocio

### Cuentas y sesión

| Regla | Valor |
|---|---|
| Roles | `student`, `tutor`, `admin` |
| Estados de usuario | `active`, `inactive`, `suspended`, `deleted` |
| Bloqueo por contraseña incorrecta | 5 intentos fallidos bloquean la cuenta durante 30 minutos |
| Inicios de sesión fallidos | 20 por IP cada 15 minutos (los aciertos no cuentan) |
| Registros | 10 por IP cada hora |
| Acciones sensibles | 10 por IP cada 15 minutos |
| Duración de la sesión | 12 horas por defecto (`JWT_EXPIRES_IN`) |
| Contraseña | Máximo 72 bytes |

### Citas

| Regla | Valor |
|---|---|
| Estados | `pending`, `confirmed`, `rejected`, `cancelled`, `completed` |
| Estados que bloquean un horario | `pending` y `confirmed` (no se permiten solapamientos con el tutor) |
| Duración | Entre 15 y 240 minutos; 60 por defecto, o la duración configurada por el tutor |
| Mensajes | Solo con una cita `confirmed` o `completed`, o con inscripción en el curso |

### Cursos y vídeos

| Regla | Valor |
|---|---|
| Inscripción | Se crea al confirmar una cita |
| Lección completada | Al alcanzar el 90 % del vídeo |
| Fuente de vídeo | YouTube |

### Archivos

| Regla | Valor |
|---|---|
| Documentos | Máximo 10 MB |
| Avatares | Máximo 2 MB |
| Materiales | Máximo 50 MB |
| Documentos por petición | 5 |
| Documentos por usuario | 20 |

## 🔧 Variables de Entorno

La plantilla completa está en [`.env.example`](.env.example). Nunca subas `.env` a git.

| Variable | Producción | Descripción |
|---|---|---|
| `NODE_ENV` | Sí (`production`) | Activa las validaciones estrictas y las cookies `Secure`. |
| `PORT` | No | Puerto de la API. Por defecto `4002`; Render lo inyecta. |
| `MONGODB_URI` | Sí | Cadena de conexión. Las citas usan transacciones, así que requiere replica set. |
| `JWT_SECRET` | Sí, ≥ 32 caracteres | Firma la sesión (cookie HttpOnly). En desarrollo, si falta, se usa uno aleatorio. |
| `JWT_EXPIRES_IN` | No | Duración de la sesión (`30m`, `12h`, `7d`…). Por defecto `12h`. |
| `FRONTEND_URL` | Sí | Orígenes del cliente permitidos, separados por comas. |
| `TRUST_PROXY` | Sí | Proxies delante de la API: `2` con Vercel + Render; `0` en local. |
| `SUPABASE_URL` | Para archivos | URL del proyecto de Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Para archivos | Clave de backend. Nunca va en el cliente. |
| `SUPABASE_STORAGE_BUCKET` | No | Bucket privado. Por defecto `copernico-private`. |

Ejemplo de `.env` para desarrollo local (sin valores reales):

```env
NODE_ENV=development
PORT=4002
MONGODB_URI=mongodb://127.0.0.1:27017/copernico?replicaSet=rs0
JWT_SECRET=
JWT_EXPIRES_IN=12h
FRONTEND_URL=http://localhost:5173
TRUST_PROXY=0
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=copernico-private
```

## 🧪 Testing & CI

```bash
npm run typecheck             # API, scripts y pruebas
npm run build                 # genera dist/src y dist/scripts
npm test                      # MongoDB efímero; la primera ejecución descarga el binario
npm run test:compiled         # arranque de dist/src/index.js en un proceso separado
npm --prefix client run typecheck
npm --prefix client test      # pruebas de utilidades sin llamadas de red reales
npm --prefix client run build # comprobación de tipos y build de Vite
```

Las pruebas de la API usan un replica set efímero y almacenamiento simulado; no necesitan acceso a MongoDB Atlas ni a un bucket de Supabase real. Ejecuta `npm run build` antes de `npm run test:compiled`: este smoke inicia `dist/src/index.js` en otro proceso, comprueba `/ready` y envía SIGTERM. No forma parte de `npm test`, para que nunca use un artefacto anterior por accidente.

Para ejecutar la API compilada localmente, configura las variables de entorno y ejecuta `npm run build` y después `npm start`. `npm run dev` usa `tsx` para desarrollo. Los scripts operativos se compilan a `dist/scripts/`; no ejecutes las migraciones de datos sobre una base nueva.

| Job de CI | Qué hace |
|---|---|
| `API (tests)` | Instalación limpia, comprobación de tipos, compilación, suite API y smoke de inicio compilado con Node 24 |
| `API (imagen de producción)` | Configuración de Compose, build de Docker e importación de la API compilada sin dependencias de desarrollo |
| `Cliente (build)` | Instalación limpia, pruebas de utilidades y build con comprobación de tipos |

CI se ejecuta en cada `push` y `pull_request` (`.github/workflows/ci.yml`).

## 🚧 Fuera de esta versión

- **Tareas, informes y disponibilidad recurrente:** sus rutas no están montadas en la API. Los archivos existen en el repositorio, pero no forman parte de la versión publicada.
- **SQLite y envío de correo:** no se usan.
- **Creación de cursos y panel de administración en el cliente:** todavía no existen. Para el alta inicial, ver [DEPLOY.md](DEPLOY.md).

## 🌍 Despliegue

Ver [DEPLOY.md](DEPLOY.md): MongoDB Atlas, Supabase Storage, Render (`render.yaml`), Vercel (`client/vercel.json`) y comprobaciones posteriores.

## 📜 Licencia

Apache License 2.0. Consulta el archivo [LICENSE](LICENSE).

<div align="center">

<sub>Hecho con ❤️ para Copérnico Academy</sub>

</div>

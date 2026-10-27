# Copérnico Academy

Plataforma de tutorías y asesoramiento académico: reserva de citas con tutores, cursos con vídeos de YouTube, documentos y materiales privados, notas, mensajes y notificaciones.

## Stack

- **API:** Node.js 24, Express 4, Mongoose 8 sobre MongoDB (replica set).
- **Cliente:** React 18 + Vite.
- **Archivos:** Supabase Storage con bucket privado; descargas mediante enlaces firmados.
- **Despliegue:** Vercel (cliente) y Render (API). Ver [DEPLOY.md](DEPLOY.md).

## Estructura

```
src/                      API: configuración, rutas, controladores, modelos, servicios
test/                     Tests de integración (node:test + MongoDB en memoria)
scripts/                  Migraciones de la versión anterior (ver DEPLOY.md)
client/                   Cliente React + Vite (client/vercel.json: build y reescritura /api)
render.yaml               Blueprint de Render para la API
docker-compose.yml        Desarrollo local con Docker (MongoDB replica set, API y cliente)
.github/workflows/ci.yml  Tests de la API y build del cliente
DEPLOY.md                 Guía de despliegue en producción
```

## Desarrollo local

### Opción A: Docker

```bash
docker compose up --build
```

- Cliente: http://localhost:5173
- API: http://localhost:4002/api/health

Para probar subidas de archivos, define `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en un `.env` en la raíz: Compose lo lee. Sin ellas, las subidas responden `503 STORAGE_NOT_CONFIGURED`.

### Opción B: sin Docker

Necesitas Node 24 (ver `.nvmrc`) y MongoDB con replica set. Puedes usar un `mongod --replSet rs0` local (y `rs.initiate()` una vez) o un cluster de Atlas.

```bash
cp .env.example .env          # en Windows: copy .env.example .env
npm ci
npm run dev                   # API en http://localhost:4002

cd client
npm ci
npm run dev                   # cliente en http://localhost:5173
```

El cliente llama a `/api` y Vite lo reenvía a `API_PROXY_TARGET` (por defecto `http://localhost:4002`).

## Variables de entorno

La plantilla está en [`.env.example`](.env.example). Nunca subas `.env` a git.

| Variable | Producción | Descripción |
|---|---|---|
| `NODE_ENV` | Sí (`production`) | Activa las validaciones estrictas y las cookies `Secure`. |
| `PORT` | No | Puerto de la API. Por defecto `4002`; Render lo inyecta. |
| `MONGODB_URI` | Sí | Cadena de conexión. Las citas usan transacciones, así que requiere replica set. |
| `JWT_SECRET` | Sí, ≥ 32 caracteres | Firma de la sesión (cookie HttpOnly). En desarrollo, si falta, se usa uno aleatorio. |
| `JWT_EXPIRES_IN` | No | Duración de la sesión (`30m`, `12h`, `7d`…). Por defecto `12h`. |
| `FRONTEND_URL` | Sí | Orígenes del cliente permitidos, separados por comas. |
| `TRUST_PROXY` | Sí | Número de proxies delante de la API. `2` con Vercel + Render; `0` en local. |
| `SUPABASE_URL` | Sí (para archivos) | URL del proyecto de Supabase. Va junto con la clave. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí (para archivos) | Clave de backend. Nunca en el cliente. |
| `SUPABASE_STORAGE_BUCKET` | No | Bucket privado. Por defecto `copernico-private`. |

## Tests y build

```bash
npm test                      # API: tests de integración (la primera vez descarga MongoDB en memoria)
cd client && npm run build    # cliente: build de producción
```

CI ejecuta ambos en cada push y pull request (`.github/workflows/ci.yml`).

## Funcionalidad

- **Cuentas:** registro de estudiantes y tutores, sesión por cookie HttpOnly. Cambiar contraseña o email y desactivar la cuenta invalidan las sesiones abiertas.
- **Citas:** reserva con un tutor para un curso publicado. El tutor confirma o cancela; se comprueban solapamientos del tutor.
- **Cursos:** la inscripción se crea al confirmar una cita. Las lecciones usan vídeos de YouTube; el progreso se marca como completado al 90 %.
- **Notas, mensajes y notificaciones:** los mensajes solo se abren tras una cita confirmada o una inscripción.
- **Documentos, avatares y materiales:** almacenamiento privado en Supabase. Documentos hasta 10 MB y avatares hasta 2 MB.
- **Administración:** el rol `admin` puede enviar notificaciones manuales desde la API. Todavía no hay panel de administración en el cliente.

## Fuera de esta versión

- Tareas (`assignments`), informes (`reports`) y disponibilidad recurrente: sus modelos y controladores no están montados ni forman parte de la API publicada.
- SQLite y el envío de correo electrónico: no se usan.
- Pantalla de creación de cursos: todavía no existe; ver [DEPLOY.md](DEPLOY.md) para el alta inicial.

## Despliegue

Ver [DEPLOY.md](DEPLOY.md): MongoDB Atlas, Supabase Storage, Render (`render.yaml`), Vercel (`client/vercel.json`) y comprobaciones posteriores.

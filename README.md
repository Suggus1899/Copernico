# Copernico Academy (prototipo)

Copernico Academy es el nombre del proyecto en evolución. Actualmente este repositorio contiene un prototipo basado en un CRUD desarrollado con el stack MERN (MongoDB, Express, React, Node). La intención es iterar sobre esta base hasta convertirla en un sistema de tutorías y asesoramiento académico completo.

**Estado actual (resumen)**
- CRUD mínimo implementado para ejemplos de tareas/recursos.
- Frontend: React + Vite (carpeta `client/`).
- Backend: Node + Express (carpeta `src/`).
- Autenticación: JWT (según implementación presente en `src/libs` y `src/middlewares`).

**Requisitos**
- Node.js v16+ (recomendado v18+)
- npm o pnpm
- Docker Desktop (opcional, recomendado para pruebas integradas)

**Arranque rápido (Windows - PowerShell)**

Opción A — Docker Compose (recomendado para pruebas integradas)

```powershell
# Desde la raíz del repositorio
docker compose up -d --build

# Ver estado y logs (opcional)
docker compose ps
docker compose logs --tail 200 api
docker compose logs --tail 200 tasksdb

# Parar y eliminar contenedores
docker compose down
```

Abre: `http://localhost:4000` (en producción el backend sirve el frontend construido).

Opción B — Desarrollo local (hot-reload)

Backend (terminal PowerShell):

```powershell
cd "c:\Users\Gus\Documents\Proyectos uni\S.I-Copernico-Academy"
npm install
$env:PORT=4000; npm run dev
```

Frontend (otra terminal PowerShell):

```powershell
cd "c:\Users\Gus\Documents\Proyectos uni\S.I-Copernico-Academy\client"
npm install
npm run dev
```

Frontend: `http://localhost:5173`. Backend API: `http://localhost:4000`.

Si quieres backend local y Mongo en Docker:

```powershell
docker run -d --name tasksdb -p 27017:27017 -v tasksdbdata:/data/db mongo:6
# luego en la raíz del proyecto
npm install
$env:MONGODB_URI='mongodb://localhost:27017/mern-tasks'; $env:PORT=4000; npm run dev
```

**Variables de entorno importantes**

Coloca un archivo `.env` en la raíz con al menos estas variables (no subir a git):

```
MONGODB_URI=mongodb://localhost:27017/mern-tasks
PORT=4000
TOKEN_SECRET=un_secreto_largo
FRONTEND_URL=http://localhost:5173
```

En Docker Compose el `api` usa `MONGODB_URI=mongodb://tasksdb:27017/mern-tasks`.

**Resolución de problemas comunes**

- 404 en `/` o `/favicon.ico`:
  - El servidor devuelve 404 si no existe una ruta para `/`. Añade o prueba `GET /ping` para comprobar que el backend responde.
- "Cannot use import statement outside a module":
  - Asegúrate de que `package.json` contiene `"type": "module"` si usas `import`/`export` (ESM), o convierte los archivos a CommonJS con `require`/`module.exports`.
- MongooseServerSelectionError (ECONNREFUSED):
  - Significa que la app no puede conectar a MongoDB. Si usas Docker Compose, verifica que `tasksdb` esté `Up`. Si ejecutas localmente, confirma que Mongo se esté ejecutando en `localhost:27017`.
- Puerto 4000 en uso:
  - Encuentra y mata el proceso (PowerShell):

```powershell
netstat -ano | findstr :4000
Stop-Process -Id <PID> -Force
```

**Roadmap (alto nivel)**

1. Autenticación y roles (estudiante, tutor, admin).
2. Perfiles de tutor con materias y valoraciones.
3. Sistema de reservas/agenda y mensajería interna.
4. Panel administrativo y métricas.
5. Seguridad, tests y despliegue (Docker/CI).

**Contribuir**
- Abrir issues describiendo el problema o mejora.
- Crear ramas `feature/` o `fix/` y enviar pull requests.

**Licencia**

MIT — ver LICENSE (si aplica).


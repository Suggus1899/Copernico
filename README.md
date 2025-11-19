### MERN Stack CRUD with JWT

Proyecto MERN (React + Express + MongoDB) con autenticación JWT.

Este README está pensado para un usuario que acaba de clonar el repositorio y quiere ejecutarlo. Incluye instrucciones rápidas (Docker recomendado) y pasos para desarrollo local.

-----

## Requisitos

- Node.js (v18+ recomendado) y npm — para ejecutar en modo desarrollo.
- Docker Desktop — para ejecutar con Docker Compose (RECOMENDADO para pruebas integradas y producción).
- git — para clonar el repositorio.

-----

## Quick start — clona y ejecuta (usuario nuevo)

1) Clona el repositorio y entra en la carpeta:

```powershell
git clone https://github.com/fazt/mern-crud-auth
cd "mern-crud-auth"
```

2) Opción A — Ejecutar con Docker Compose (RECOMENDADO)

Requisitos: Docker Desktop debe estar instalado y abierto.

```powershell
# Construye imágenes y levanta MongoDB + API (el Dockerfile hace build del cliente)
docker compose up -d --build

# Comprueba estado y logs si hace falta
docker compose ps
docker compose logs --tail 200 api
docker compose logs --tail 200 tasksdb
```

Abre en tu navegador: `http://localhost:4000` (el backend en producción sirve el frontend construido).

Para parar y eliminar contenedores:

```powershell
docker compose down
```

3) Opción B — Desarrollo local (hot-reload: backend + frontend por separado)

Usa esta opción para desarrollar con recarga automática (nodemon y Vite).

Backend:

```powershell
cd "C:\Users\Gus\Documents\Proyectos uni\mern-crud-auth"
npm install
$env:PORT=4000; npm run dev
```

Frontend (en otra terminal):

```powershell
cd "C:\Users\Gus\Documents\Proyectos uni\mern-crud-auth\client"
npm install
npm run dev
```

Abre el frontend en `http://localhost:5173`. Las peticiones API irán a `http://localhost:4000`.

4) Si quieres ejecutar backend local y Mongo en Docker

```powershell
docker run -d --name tasksdb -p 27017:27017 -v tasksdbdata:/data/db mongo:6
# luego en la raíz del proyecto
npm install
$env:MONGODB_URI='mongodb://localhost:27017/mern-tasks'; $env:PORT=4000; npm run dev
```

-----

## Variables de entorno importantes

Coloca un `.env` en la raíz (no lo subas a git) con las variables necesarias:

```
MONGODB_URI=mongodb://localhost:27017/mern-tasks
PORT=4000
TOKEN_SECRET=un_secreto_largo
FRONTEND_URL=http://localhost:5173
```

Cuando ejecutes con Docker Compose, el contenedor `api` está configurado para usar `MONGODB_URI=mongodb://tasksdb:27017/mern-tasks` (resuelve al servicio `tasksdb` dentro de la red de Compose).

-----

## Resolución de problemas comunes

- Cannot GET / :
	- Si ves esto en `http://localhost:4000` es porque el backend no está sirviendo los archivos estáticos del cliente (en producción el backend sirve `client/dist`). Si usas Docker Compose, vuelve a construir: `docker compose up -d --build`.

- MongooseServerSelectionError (ECONNREFUSED):
	- Significa que la app no puede conectar a MongoDB. Si usas Docker Compose, el contenedor `tasksdb` debe estar `Up`. Ejecuta `docker compose ps` y mira los logs `docker compose logs tasksdb`.
	- Si ejecutas backend local, asegúrate de que Mongo esté corriendo en `localhost:27017` (o ajusta `MONGODB_URI`).

- Port 4000 is already in use:
	- Encuentra el PID y mata el proceso:

```powershell
netstat -ano | findstr :4000
Stop-Process -Id <PID> -Force
```

- Docker Desktop pipe/socket errors:
	- Abre o reinicia Docker Desktop.

-----

## Notas avanzadas

- El `Dockerfile` en la raíz es multi-stage: primero construye el `client` (Vite) y luego crea una imagen pequeña que contiene sólo las dependencias de producción del backend y `client/dist` para servir estáticos.
- Si necesitas pasar variables al build del cliente (p. ej. `VITE_API_URL`), dime y añado soporte para `build-arg` en el `Dockerfile`.

-----

Si al seguir estos pasos encuentras errores pega aquí las salidas de los comandos relevantes (`docker compose ps`, `docker compose logs --tail 200 api`, salida de `npm run dev`, etc.) y te ayudo a resolverlos.


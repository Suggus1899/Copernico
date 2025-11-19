# **Copernico Academy — Guía técnica del proyecto**

## **Resumen**
- Proyecto: Copernico Academy (prototipo, objetivo: sistema de tutorías y asesoramiento académico).
- Stack: MongoDB (Mongoose) • Express • Node.js • React (Vite).
- Backend: `src/` (API REST, controladores, modelos, middlewares).
- Frontend: `client/` (React + Vite).

## **Arquitectura y responsabilidades**
- API REST (Express) sirve los endpoints bajo el prefijo `/api`.
- Autenticación basada en JWT; responsabilidad: `src/libs/jwt.js` + `src/middlewares/auth.middleware.js`.
- Validaciones: definidas con Zod en `src/schemas/*` y aplicadas por `src/middlewares/validator.middleware.js`.
- Persistencia: MongoDB mediante Mongoose (`src/models/*`).

## **Estructura del repositorio**

- `src/`
	- `app.js` — registro de middlewares, CORS, rutas y configuración de entrega estática en producción.
	- `index.js` — arranque: conectar a MongoDB, levantar servidor.
	- `controllers/` — capa de negocio (auth, tasks, etc.).
	- `routes/` — definición de rutas y montaje de controladores.
	- `models/` — esquemas Mongoose.
	- `middlewares/` — auth, validación y otras capas transversales.
	- `libs/` — utilidades (JWT helpers, etc.).

- `client/` — SPA React (Vite). UI, rutas de cliente, llamadas a API.
- Root: `package.json`, `docker-compose.yml`, `Dockerfile`, `README.md`, `PROJECT_GUIDE.md`.

## **Requisitos y variables**

- Node.js v16+ (recomendado v18+). npm o pnpm.
- (Opcional) Docker Desktop para entornos integrados.

Variables mínimas (archivo `.env` en la raíz):

```
MONGODB_URI=mongodb://localhost:27017/mern-tasks
PORT=4000
TOKEN_SECRET=<secreto_largo>
FRONTEND_URL=http://localhost:5173
```

## **Ejecutar en desarrollo**

Backend (desarrollo, hot-reload via nodemon):

```powershell
cd "c:\Users\Gus\Documents\Proyectos uni\S.I-Copernico-Academy"
npm install
$env:PORT=4000; npm run dev
```

Frontend (Vite):

```powershell
cd client
npm install
npm run dev
```

Docker (entorno integrado):

```powershell
docker compose up -d --build
docker compose ps
docker compose logs --tail 200 api
docker compose down
```

En producción el backend debe servir los activos construidos en `client/dist` (bloque en `app.js` bajo `NODE_ENV === 'production'`).

## **Endpoints y convenciones**

- Prefijo API: `/api`.
- Autenticación: rutas sensibles usan middleware `auth`.
- Rutas de ejemplo: `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/tasks`, `POST /api/tasks`.

Nótese que los routers exportan `export default router` y se importan desde `app.js`.

## **Checklist rápido para diagnosticar 404 en `/`**

- Confirmar: `app.js` no define `GET /` ni sirve `client/dist` en modo desarrollo → 404 esperado.
- Acción mínima: añadir health-check y handler de favicon (recomendado).

Fragmento para `src/app.js`:

```javascript
// health check
app.get('/ping', (req, res) => res.json({ status: 'ok', ts: Date.now() }));
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Copernico Academy API' }));
app.get('/favicon.ico', (req, res) => res.sendStatus(204));
```

## **Workflow para cambios y parches**

Recomendación de flujo de trabajo para el equipo:

1. Crear branch local con convención: `feature/<ticket>` o `fix/<ticket>`.
2. Implementar cambios + pruebas locales (unitarias/integración manual).
3. Ejecutar linters y pruebas (si existen).
4. Commit con mensaje claro y atomic: `git commit -m "fix(auth): validate token expiry"`.
5. Push y abrir PR → añadir descripción, pasos para reproducir, evidencia (logs, screenshots, curl).

Comandos útiles:

```powershell
git checkout -b fix/add-ping-route
git add .
git commit -m "chore(server): add /ping healthcheck and favicon handler"
git push -u origin fix/add-ping-route
```

## **Cómo preparar y aplicar un patch**

- Crear patch:

```
git format-patch main --stdout > fix-add-ping.patch
```

- Aplicar patch en otra copia:

```powershell
git apply fix-add-ping.patch
```

Use `git am` si desea aplicar correos generados por `format-patch` con metadata.

## **Agregar una nueva API (pasos técnicos)**

1. Model: crear `src/models/<entity>.model.js` (Mongoose schema + indexes).
2. Controller: crear `src/controllers/<entity>.controller.js` con funciones CRUD (async/await, manejo de errores consistent).
3. Routes: crear `src/routes/<entity>.routes.js` exportando Router; montar en `app.js` con `app.use('/api', routes)`.
4. Validación: definir Zod schema en `src/schemas/` y usar `validator.middleware`.
5. Tests/manual: probar endpoints con curl / Postman; actualizar documentación.

Ejemplo de estructura de `controller`:

```javascript
export const createEntity = async (req, res, next) => {
	try {
		const doc = await Model.create(req.body);
		return res.status(201).json(doc);
	} catch (err) {
		next(err);
	}
};
```

## **Pruebas y verificación**

- Health checks: `GET /ping` → 200.
- Probar rutas protegidas con token válido.
- Logs: usar `morgan` en dev para trazabilidad de peticiones.

Comandos de verificación (PowerShell):

```powershell
Invoke-RestMethod http://localhost:4000/ping
Invoke-RestMethod http://localhost:4000/api/tasks
```

## **Checklist para Pull Request**

- [ ] Descripción y motivación del cambio.
- [ ] Pasos para reproducir las pruebas manuales.
- [ ] Tests añadidos o actualizados si procede.
- [ ] Variables de entorno documentadas si se requirieron nuevas.
- [ ] Impacto en migration/data documentado si procede.

## **Sugerencias operativas / Siguiente fase**

- Añadir CI básico: lint, run unit tests, build client, run server smoke test.
- Añadir E2E ligero (Playwright / Cypress) para flujos críticos (login, crear tarea).
- Definir política de releases y tags semánticos para despliegues.

---
Documento técnico para uso interno del equipo. Mantener actualizado al realizar cambios significativos en estructura o despliegue.

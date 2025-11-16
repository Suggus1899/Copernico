
# Copernico Academy (prototipo)

Proyecto inicial: un CRUD desarrollado con el stack MERN (MongoDB, Express, React, Node). Este repositorio contiene la primera versión mínima funcional: API REST en Node/Express con persistencia en MongoDB y una UI en React creada con Vite. El objetivo a mediano plazo es evolucionar este CRUD en un sistema completo de tutorías y asesoramiento académico llamado "Copernico Academy" mediante parches y mejoras iterativas.

## Estado actual
- Implementado: CRUD básico para entidades principales (usuarios, perfiles, recursos académicos).
- Frontend: React + Vite con rutas y formularios para crear/editar/listar recursos.
- Backend: Node + Express con endpoints REST y conexión a MongoDB.
- Autenticación: (marcar si hay autenticación actualmente; si no, pendiente de implementar).

## Tech stack
- MongoDB
- Express
- Node.js
- React (Vite)
- (Opcional) Mongoose para modelos, JWT para auth

## Estructura propuesta del repo
- /server — código de la API (Express, modelos, controladores, rutas)
- /client — aplicación React (Vite)
- /README.md — este archivo
- /docs — documentación y notas de diseño

## Arranque rápido (Windows)
1. Clonar el repositorio:
   - git clone <url-del-repo>
2. Backend:
   - cd "c:\Users\Gus\Documents\Proyectos uni\S.I-Copernico-Academy\server"
   - npm install
   - npm run dev   (o npm start según el script)
3. Frontend:
   - cd "..\client"
   - npm install
   - npm run dev
4. Asegurarse de tener MongoDB corriendo (local o URI de MongoDB Atlas) y configurar la variable de entorno MONGODB_URI.

## Funcionalidades planeadas (roadmap)
Fases de evolución hacia Copernico Academy:
1. Autenticación y roles (estudiante, tutor, administrador).
2. Perfiles de tutor con calificaciones y materias.
3. Sistema de reservas/agenda (reserva de tutorías, calendarios).
4. Mensajería interna y notificaciones por correo.
5. Gestión de pagos y monetización (opcional).
6. Panel administrativo, métricas y analítica educativa.
7. Seguridad, tests automatizados e integración continua.
8. Despliegue (Heroku/Vercel/Docker/Kubernetes) y documentación para producción.

## Contribuir
- Abrir issues describiendo el problema o la mejora.
- Crear ramas con prefijo feature/ o fix/ y enviar pull requests.
- Seguir las guías de estilo y añadir tests para cambios críticos.

## Licencia
MIT
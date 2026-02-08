# Manual de Instalación y Despliegue - S.I-Copernico-Academy

## 1. Introducción

Este documento detalla el procedimiento técnico exhaustivo para la instalación, configuración y puesta en marcha del sistema **S.I-Copernico-Academy**. El sistema se compone de una arquitectura MERN (MongoDB, Express, React, Node.js) y requiere una configuración precisa de variables de entorno y servicios dependientes.

## 2. Requisitos del Sistema

### Hardware

- **Procesador**: Mínimo 2 núcleos (Recomendado 4 núcleos para compilación rápida).
- **RAM**: Mínimo 4GB (8GB Recomendados, especialmente si se usa Docker).
- **Almacenamiento**: 10GB libres.

### Software Base

Asegúrese de tener instalado el siguiente software antes de comenzar:

1.  **Node.js**: Versión `lts` (18.x o superior recomendada).
    - Descargar: [nodejs.org](https://nodejs.org/)
    - Verificar: `node -v`
2.  **Git**: Para control de versiones.
    - Descargar: [git-scm.com](https://git-scm.com/)
    - Verificar: `git --version`
3.  **MongoDB**: Base de datos NoSQL.
    - Opción A: **MongoDB Community Server** (Instalación local).
    - Opción B: **MongoDB Atlas** (Servicio en la nube).
    - Opción C: **Docker** (Contenedor).
4.  **Editor de Código**: VS Code (Recomendado) con extensiones (ESLint, Prettier).

---

## 3. Preparación del Entorno

### 3.1. Obtención del Código Fuente

Clone el repositorio oficial en su máquina local usando la terminal (Git Bash, PowerShell o CMD).

```bash
git clone https://github.com/Suggus1899/S.I-Copernico-Academy.git
cd S.I-Copernico-Academy
```

### 3.2. Instalación de Dependencias

El proyecto está dividido en dos partes principales: Servidor (`raiz`) y Cliente (`/client`). Debe instalar las dependencias para **ambos**.

**Paso 1: Dependencias del Backend (Raíz)**

```bash
# Estando en la carpeta raíz S.I-Copernico-Academy/
npm install
```

**Paso 2: Dependencias del Frontend (Cliente)**

```bash
# Ingrese a la carpeta del cliente
cd client
npm install
# Regrese a la raíz si es necesario
cd ..
```

---

## 4. Configuración de Variables de Entorno

El sistema no funcionará sin las variables de entorno correctas.

### 4.1. Backend (`.env`)

En la raíz del proyecto, cree un archivo llamado `.env` copiando el contenido de `.env.template` o usando la siguiente referencia:

```ini
# Configuración del Servidor
PORT=4000
NODE_ENV=development

# Base de Datos (Ejemplo Local)
MONGODB_URI=mongodb://localhost/mern-tasks
# Base de Datos (Ejemplo Atlas)
# MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/dbname

# Seguridad (JWT)
TOKEN_SECRET=MiSecretoSuperSeguro123!
```

> [!IMPORTANT]
> Nunca suba el archivo `.env` al repositorio público. Contiene claves privadas.

### 4.2. Frontend (`client/.env`)

El cliente (Vite) puede requerir variables para saber a dónde conectar. Cree un archivo `.env` dentro de la carpeta `client/` si necesita sobreescribir la URL por defecto.

```ini
VITE_API_URL=http://localhost:4000/api
```

---

## 5. Puesta en Marcha

### Modo Desarrollo (Local)

Para trabajar en el código con recarga automática. Se recomienda abrir **dos terminales**.

**Terminal 1: Backend**

```bash
# En la raíz del proyecto
npm run dev
```

_Salida esperada:_ `Server running on port 4000` y `DB Connected`.

**Terminal 2: Frontend**

```bash
# En la carpeta client/
cd client
npm run dev
```

_Salida esperada:_ `Vite v3.x.x ready in x ms` y una URL local (ej. `http://localhost:5173`).

### Modo Producción (Simulación)

Para ver cómo se comportará la aplicación optimizada.

1.  **Construir el Frontend**:

    ```bash
    cd client
    npm run build
    ```

    Esto generará una carpeta `dist/` con los archivos estáticos.

2.  **Previsualizar**:
    ```bash
    npm run preview
    ```

---

## 6. Solución de Problemas Comunes

| Síntoma                                        | Causa Posible                                  | Solución                                                                                               |
| :--------------------------------------------- | :--------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| **Error `ECONNREFUSED` al conectar MongoDB**   | MongoDB no se está ejecutando en local.        | Inicie el servicio de MongoDB (`mongod`) o revise la URI en `.env`.                                    |
| **Error `EADDRINUSE: address already in use`** | El puerto 4000 ya está ocupado.                | Cambie `PORT` en `.env` a `4001` o cierre el proceso anterior.                                         |
| **CORS Error en el navegador**                 | El backend no acepta peticiones del frontend.  | Verifique que `cors` esté configurado en `src/index.js` o `app.js` permitiendo el origen del frontend. |
| **"Vite" no se reconoce como comando**         | No se instalaron las dependencias del cliente. | Ejecute `cd client && npm install`.                                                                    |
| **Pantalla en blanco al abrir la App**         | Error en tiempo de ejecución de React.         | Abra la consola del desarrollador (F12) para ver el error específico.                                  |

---

> [!TIP]
> **Nota para el equipo de IT**: Si utiliza Docker, asegúrese de que los contenedores de `mongo` y `web` estén en la misma red `bridge` definida en `docker-compose.yml`.

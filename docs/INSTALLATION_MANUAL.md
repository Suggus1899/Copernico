# Manual de Instalación y Despliegue - Copernico Academy

Este documento detalla los pasos necesarios para instalar y ejecutar el sistema **Copernico Academy** en un entorno local o servidor.

## 1. Requisitos Previos

Antes de comenzar, asegúrese de tener instalado el siguiente software:

- **Sistema Operativo:** Windows 10/11, macOS, o Linux.
- **Node.js:** Versión 18 o superior ([Descargar](https://nodejs.org/)).
- **NPM:** Gestor de paquetes incluido con Node.js.
- **Git:** Para clonar el repositorio ([Descargar](https://git-scm.com/)).
- **MongoDB:** Servidor local o cuenta en MongoDB Atlas.
- **Docker Desktop:** (Opcional) Si desea ejecutar el proyecto usando contenedores.

### 1.1 Guía de Instalación por Sistema Operativo

#### Windows
**Opción A: Instaladores Oficiales**
- Descargue e instale Node.js desde [nodejs.org](https://nodejs.org/).
- Descargue e instale Git desde [git-scm.com](https://git-scm.com/).

**Opción B: Vía Winget (PowerShell)**
```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

#### macOS
**Opción A: Homebrew (Recomendado)**
```bash
brew install node
brew install git
```
**Opción B: Instaladores Oficiales**
- Use los paquetes `.pkg` desde los sitios oficiales.

#### Linux

**Ubuntu / Debian / Linux Mint**
```bash
# Instalar Node.js (v18.x)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Git
sudo apt-get update
sudo apt-get install git
```

**Fedora / CentOS / RHEL**
```bash
# Instalar Node.js
sudo dnf module install nodejs:18

# Instalar Git
sudo dnf install git
```

**Arch Linux / Manjaro**
```bash
sudo pacman -S nodejs npm git
```

## 2. Instalación Local (Método Tradicional)

### Paso 1: Obtener el Código Fuente
Abra una terminal y clone el repositorio o descomprima el archivo del proyecto.
```bash
git clone <URL_DEL_REPOSITORIO>
cd S.I-Copernico-Academy
```

### Paso 2: Configuración del Backend

1. Instale las dependencias del servidor:
   ```bash
   npm install
   ```

2. Configure las variables de entorno:
   - Cree un archivo llamado `.env` en la raíz del proyecto (basado en `.env.example`).
   - Contenido mínimo requerido:
     ```env
     PORT=4000
     # URI de conexión a MongoDB (Local o Atlas)
     MONGODB_URI=mongodb://localhost:27017/merndatabase
     # Clave secreta para firmar tokens JWT
     JWT_SECRET=super_secret_key_change_me
     # URL del frontend para configurar CORS
     FRONTEND_URL=http://localhost:5173
     # Entorno
     NODE_ENV=development
     ```

### Paso 3: Configuración del Frontend

1. Navegue al directorio del cliente:
   ```bash
   cd client
   ```

2. Instale las dependencias del cliente:
   ```bash
   npm install
   ```

3. (Opcional) Verifique la configuración de Vite, usualmente no requiere `.env` adicional para desarrollo local si el backend corre en el puerto 4000 por defecto.

### Paso 4: Ejecución

Necesitará dos terminales abiertas.

**Terminal 1 (Backend):**
```bash
# Desde la raíz del proyecto
npm run dev
```
Debería ver el mensaje `Server on port 4000` y `MongoDB Connected`.

**Terminal 2 (Frontend):**
```bash
# Desde la carpeta /client
npm run dev
```
Vite iniciará el servidor de desarrollo, generalmente en `http://localhost:5173`. Acceda a esa URL desde su navegador.

---

## 3. Instalación con Docker (Método Recomendado)

Este método levanta automáticamente la base de datos, el backend y el frontend sin necesidad de instalar Node.js o MongoDB localmente.

### Paso 1: Configurar Entorno
Asegúrese de tener el archivo `.env` creado en la raíz (ver Paso 2 de Instalación Local). Las variables pueden ajustarse, pero Docker Compose provee valores por defecto para la conexión a la base de datos interna.

### Paso 2: Ejecutar Contenedores
Desde la raíz del proyecto, ejecute:

```bash
docker compose up -d --build
```
- `-d`: Ejecuta en segundo plano (detached mode).
- `--build`: Fuerza la reconstrucción de las imágenes si hubo cambios.

### Paso 3: Verificar
Una vez finalizado, los servicios estarán disponibles en:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:4000
- **MongoDB:** localhost:27017 (accesible desde herramientas como MongoDB Compass).

Para detener los servicios:
```bash
docker compose down
```

## 4. Solución de Problemas Comunes

- **Error de Conexión a MongoDB:** Verifique que la `MONGODB_URI` en el archivo `.env` sea correcta. Si usa Docker, asegúrese de que el contenedor de base de datos (`copernico-db`) esté corriendo.
- **Puertos Ocupados:** Asegúrese de que los puertos 4000 (Backend), 5173 (Frontend) y 27017 (MongoDB) no estén siendo usados por otra aplicación.
- **Error CORS:** Si el frontend no puede comunicarse con el backend, verifique que `FRONTEND_URL` en el `.env` del backend coincida con la URL donde corre el frontend.

# Solución: Error 404 en /api/messages/conversations

## Problema
El navegador está intentando acceder a `http://localhost:4000/api/messages/conversations` pero el backend está corriendo en el puerto **4002**.

## Causa
El navegador tiene cacheada una configuración anterior de la API URL.

## Solución

### Opción 1: Limpiar Caché del Navegador (Recomendado)

1. **Abre las Herramientas de Desarrollador** (F12)
2. **Haz clic derecho en el botón de recargar** (junto a la barra de direcciones)
3. **Selecciona "Vaciar caché y recargar de manera forzada"** o **"Hard Reload"**

O también:

1. Presiona **Ctrl + Shift + Delete** (Windows) o **Cmd + Shift + Delete** (Mac)
2. Selecciona "Caché" o "Cached images and files"
3. Haz clic en "Borrar datos"
4. Recarga la página con **Ctrl + F5** (Windows) o **Cmd + Shift + R** (Mac)

### Opción 2: Limpiar localStorage

1. **Abre las Herramientas de Desarrollador** (F12)
2. Ve a la pestaña **"Application"** (Chrome) o **"Almacenamiento"** (Firefox)
3. En el menú lateral, busca **"Local Storage"**
4. Haz clic en `http://localhost:5173`
5. Haz clic derecho y selecciona **"Clear"** o **"Borrar todo"**
6. Recarga la página

### Opción 3: Modo Incógnito

1. Abre una **ventana de incógnito/privada**
2. Ve a http://localhost:5173
3. Inicia sesión
4. Prueba la sección de Mensajes

### Opción 4: Reiniciar Todo

Si nada de lo anterior funciona:

```bash
# Detener los servidores (Ctrl+C en las terminales)

# Limpiar caché de npm
npm cache clean --force

# En la carpeta client
cd client
rm -rf node_modules/.vite
npm run dev

# En la carpeta raíz (en otra terminal)
npm run dev
```

## Verificación

Después de aplicar cualquiera de las soluciones:

1. Abre la **Consola del Navegador** (F12 → Console)
2. Ve a la sección **"Mensajes"**
3. Deberías ver peticiones a `http://localhost:4002/api/messages/conversations`
4. Si ves el error 404, verifica que la URL sea correcta

## Configuración Correcta

El archivo `client/.env` debe contener:

```env
VITE_API_URL=http://localhost:4002/api
```

El archivo `client/src/utils/axiosConfig.js` usa esta variable:

```javascript
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:4002/api';
```

## Verificar que el Backend Esté Corriendo

En la terminal del backend, deberías ver:

```
✅ MongoDB Connected: localhost
📊 Database: merndatabase
🚀 Server running on port 4002
🌍 Environment: development
```

Si el backend está en otro puerto, actualiza el archivo `client/.env` con el puerto correcto.

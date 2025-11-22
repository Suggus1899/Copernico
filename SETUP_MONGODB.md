# 🔧 Guía de Configuración de MongoDB

## Opción 1: MongoDB Atlas (Recomendado - Gratis y en la nube) ☁️

### Paso 1: Crear cuenta en MongoDB Atlas
1. Ve a: https://www.mongodb.com/cloud/atlas/register
2. Crea una cuenta gratuita (puedes usar Google, GitHub, o email)
3. Completa el registro

### Paso 2: Crear un Cluster
1. Una vez dentro, haz clic en **"Build a Database"**
2. Selecciona el plan **FREE (M0)** - es completamente gratis
3. Elige una región cercana a ti (por ejemplo: `N. Virginia (us-east-1)`)
4. Haz clic en **"Create"** y espera 1-3 minutos a que se cree el cluster

### Paso 3: Crear Usuario de Base de Datos
1. En la pantalla de "Get started", ve a **"Create Database User"**
2. Username: elige un nombre (ej: `admin`)
3. Password: crea una contraseña segura (guárdala bien)
4. Haz clic en **"Create User"**

### Paso 4: Configurar Acceso de Red
1. En "Network Access", haz clic en **"Add IP Address"**
2. Selecciona **"Allow Access from Anywhere"** (0.0.0.0/0)
3. Haz clic en **"Confirm"**

### Paso 5: Obtener Connection String
1. Haz clic en **"Connect"** en tu cluster
2. Selecciona **"Connect your application"**
3. Copia la connection string que aparece (algo como):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Reemplaza `<username>` con tu usuario y `<password>` con tu contraseña
5. Agrega el nombre de la base de datos al final:
   ```
   mongodb+srv://admin:tuPassword123@cluster0.xxxxx.mongodb.net/merndatabase?retryWrites=true&w=majority
   ```

### Paso 6: Configurar el archivo .env
1. Abre el archivo `.env` en la raíz del proyecto
2. Comenta la línea de MongoDB local (agrega # al inicio)
3. Descomenta la línea de MongoDB Atlas y pega tu connection string:
   ```env
   # MONGODB_URI=mongodb://localhost:27017/merndatabase
   MONGODB_URI=mongodb+srv://admin:tuPassword123@cluster0.xxxxx.mongodb.net/merndatabase?retryWrites=true&w=majority
   ```

### Paso 7: Reiniciar el servidor
1. Detén el servidor backend (Ctrl+C)
2. Inícialo de nuevo con `npm run dev`

¡Listo! Tu aplicación debería conectarse a MongoDB Atlas.

---

## Opción 2: MongoDB Local (Requiere instalación) 💻

### Windows:
1. Descarga MongoDB Community Server:
   https://www.mongodb.com/try/download/community
2. Instala MongoDB (sigue el instalador)
3. MongoDB se iniciará automáticamente como servicio
4. El archivo `.env` ya está configurado para usar MongoDB local

### Verificar que MongoDB está corriendo:
```powershell
# Verificar el servicio
Get-Service -Name MongoDB

# O verificar el puerto
netstat -ano | findstr :27017
```

---

## Solución de Problemas

### Error: "authentication required"
- Verifica que tu usuario y contraseña en la connection string sean correctos
- Asegúrate de haber reemplazado `<username>` y `<password>` en la URI

### Error: "IP not whitelisted"
- Ve a Network Access en MongoDB Atlas
- Agrega tu IP actual o permite acceso desde cualquier lugar (0.0.0.0/0)

### Error: "timeout"
- Verifica tu conexión a internet (para Atlas)
- Verifica que MongoDB local esté corriendo (para local)

---

## ¿Necesitas más ayuda?
- Documentación MongoDB Atlas: https://docs.atlas.mongodb.com/
- Comunidad: https://community.mongodb.com/


# 🔧 Fix: Error al Subir Videos

## 🐛 Problema Identificado

**Error**: `ENOENT: no such file or directory, open 'uploads/videos/...'`

**Causa**: Los directorios necesarios para almacenar archivos subidos (`uploads/videos/`, `uploads/thumbnails/`, `uploads/avatars/`) no existían en el sistema de archivos.

## ✅ Solución Implementada

### 1. Creación Automática de Directorios

**Archivo**: `src/controllers/classVideo.controller.js`

Se actualizó la configuración de multer para crear directorios automáticamente si no existen:

```javascript
destination: (req, file, cb) => {
  let uploadPath;
  if (file.fieldname === 'videoFile') {
    uploadPath = 'uploads/videos/';
  } else if (file.fieldname === 'thumbnailFile') {
    uploadPath = 'uploads/thumbnails/';
  }
  
  // Crear directorio si no existe
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log(`📁 Directorio creado: ${uploadPath}`);
  }
  
  cb(null, uploadPath);
}
```

### 2. Script de Inicialización

**Archivo**: `scripts/init_directories.js`

Script que asegura que todos los directorios necesarios existan:

```javascript
const directories = [
  'uploads',
  'uploads/videos',
  'uploads/thumbnails',
  'uploads/avatars'
];

directories.forEach(dir => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Directorio creado: ${dir}`);
  }
});
```

**Comandos disponibles**:
- `npm run init:dirs` - Ejecutar manualmente
- `npm install` - Se ejecuta automáticamente (postinstall)

### 3. Archivos .gitkeep

Se crearon archivos `.gitkeep` en cada directorio para mantenerlos en Git:

```
uploads/
├── videos/.gitkeep
├── thumbnails/.gitkeep
└── avatars/.gitkeep
```

### 4. Actualización de .gitignore

Se configuró para ignorar archivos subidos pero mantener la estructura de directorios:

```gitignore
# Uploaded files (ignore content but keep directories)
uploads/*
!uploads/.gitkeep
!uploads/videos/
!uploads/thumbnails/
!uploads/avatars/
uploads/videos/*
!uploads/videos/.gitkeep
uploads/thumbnails/*
!uploads/thumbnails/.gitkeep
uploads/avatars/*
!uploads/avatars/.gitkeep
```

## 🎯 Estructura de Directorios

```
COPERNICO ACT 2.0/
├── uploads/
│   ├── videos/          # Videos de clases subidos
│   │   └── .gitkeep
│   ├── thumbnails/      # Miniaturas de videos
│   │   └── .gitkeep
│   └── avatars/         # Avatares de usuarios
│       └── .gitkeep
├── src/
│   └── controllers/
│       └── classVideo.controller.js  # Actualizado
└── scripts/
    └── init_directories.js           # Nuevo
```

## 🚀 Cómo Funciona Ahora

### Flujo de Subida de Video

1. **Usuario selecciona archivo** en el formulario
2. **Frontend envía** archivo al backend
3. **Multer verifica** si el directorio existe
4. **Si no existe**: Se crea automáticamente
5. **Archivo se guarda** con nombre único
6. **URL se genera** y se guarda en la base de datos

### Prevención de Errores

- ✅ **Creación automática**: Directorios se crean si no existen
- ✅ **Verificación en cada subida**: Multer verifica antes de guardar
- ✅ **Script de inicialización**: Se ejecuta al instalar dependencias
- ✅ **Persistencia en Git**: Archivos .gitkeep mantienen estructura

## 🧪 Pruebas Realizadas

### 1. Subida de Video con URL
- ✅ URL de YouTube
- ✅ URL de Vimeo
- ✅ URL directa a archivo

### 2. Subida de Archivo Local
- ✅ Archivo de video (.mp4, .webm, .avi)
- ✅ Miniatura opcional (.jpg, .png)
- ✅ Validación de tamaño (máx 500MB)

### 3. Creación Automática de Directorios
- ✅ Primera subida crea directorios
- ✅ Logs confirman creación
- ✅ Subidas subsecuentes funcionan

## 📊 Logs de Éxito

Cuando funciona correctamente, verás:

```
📁 Directorio creado: uploads/videos/
=== CREATE VIDEO REQUEST ===
User: { id: '...', role: 'tutor' }
Video file processed: videoFile-1234567890-123456789.mp4
Video saved to database: 507f1f77bcf86cd799439011
Video creation successful
POST /api/videos 201 1234.567 ms
```

## 🔍 Solución de Problemas

### Si el error persiste:

1. **Verificar permisos de escritura**:
   ```bash
   # Windows
   icacls uploads /grant Users:F /T
   ```

2. **Ejecutar script manualmente**:
   ```bash
   npm run init:dirs
   ```

3. **Verificar que los directorios existen**:
   ```bash
   dir uploads
   ```

4. **Revisar logs del servidor**:
   - Buscar mensajes de "Directorio creado"
   - Verificar errores de permisos

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| ENOENT | Directorio no existe | Ejecutar `npm run init:dirs` |
| EACCES | Sin permisos | Verificar permisos de escritura |
| ENOSPC | Sin espacio en disco | Liberar espacio |
| File too large | Archivo > 500MB | Reducir tamaño o aumentar límite |

## ✅ Estado Final

- ✅ **Directorios creados**: uploads/videos, uploads/thumbnails, uploads/avatars
- ✅ **Creación automática**: Funciona en cada subida
- ✅ **Script de inicialización**: Disponible y funcional
- ✅ **Git configurado**: Mantiene estructura sin archivos
- ✅ **Servidor actualizado**: Cambios aplicados

## 🎉 Resultado

El sistema de subida de videos ahora funciona correctamente. Los tutores pueden:
- ✅ Subir videos por archivo o URL
- ✅ Agregar miniaturas opcionales
- ✅ Asignar videos a estudiantes específicos
- ✅ Ver sus videos en "Videos de Clases"

**El error "Error al subir video" ha sido resuelto completamente.** 🚀
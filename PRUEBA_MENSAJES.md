# Guía de Prueba - Sistema de Mensajes

## Estado del Sistema

✅ **Backend**: Corriendo en http://localhost:4002  
✅ **Frontend**: Corriendo en http://localhost:5173  
✅ **Base de Datos**: MongoDB conectada  
✅ **Cursos Migrados**: 2 cursos creados desde citas existentes

## Cómo Probar la Funcionalidad

### Opción 1: Desde la Sección "Cursos" (Estudiante)

1. Inicia sesión como **estudiante**
2. Ve a la sección **"Cursos"** en el menú lateral
3. Verás las tarjetas de tus cursos activos
4. Haz clic en el botón **"Enviar mensaje"** en cualquier curso
5. Serás redirigido a la sección de Mensajes con el tutor seleccionado
6. Escribe y envía tu mensaje

### Opción 2: Desde la Sección "Mensajes" (Estudiante)

1. Inicia sesión como **estudiante**
2. Ve a la sección **"Mensajes"** (💬) en el menú lateral
3. En la barra lateral izquierda verás la lista de tutores con los que tienes cursos activos
4. Haz clic en cualquier tutor para abrir la conversación
5. Escribe y envía tu mensaje

### Opción 3: Como Tutor

1. Inicia sesión como **tutor**
2. Ve a la sección **"Mensajes"** (💬)
3. Verás la lista de estudiantes con los que tienes citas confirmadas
4. Haz clic en cualquier estudiante para abrir la conversación
5. Escribe y envía tu mensaje

## Flujo Completo de Prueba

### Escenario: Nueva Asesoría

1. **Estudiante** solicita una asesoría con un tutor
   - Ve a "Tutores"
   - Selecciona un tutor
   - Solicita una asesoría con materia y fecha

2. **Tutor** recibe notificación y confirma la cita
   - Ve a "Notificaciones" o "Agenda"
   - Confirma la cita
   - ✨ **Automáticamente se crea el curso**

3. **Ambos usuarios** pueden ahora enviarse mensajes
   - El estudiante ve al tutor en "Mensajes"
   - El tutor ve al estudiante en "Mensajes"
   - Pueden chatear libremente

## Verificación Técnica

### Verificar que se creó el curso

Puedes verificar en la base de datos que se creó el curso:

```javascript
// En MongoDB Compass o shell
db.courses.find({
  instructor: ObjectId("ID_DEL_TUTOR")
})
```

### Verificar relación estudiante-curso

```javascript
db.courses.find({
  "enrolledStudents.student": ObjectId("ID_DEL_ESTUDIANTE")
})
```

## Solución de Problemas

### Si no aparecen conversaciones en "Mensajes"

1. Verifica que la cita esté en estado `confirmed` o `completed`
2. Ejecuta el script de migración nuevamente:
   ```bash
   npm run migrate:courses
   ```
3. Refresca el navegador

### Si no se puede enviar mensaje

1. Verifica que existe una cita confirmada entre estudiante y tutor
2. Verifica que el curso se haya creado correctamente
3. Revisa los logs del backend para ver errores

### Logs del Backend

Para ver los logs en tiempo real:
```bash
# Los logs aparecen automáticamente en la consola donde corre el backend
# Busca mensajes como:
# "Cita confirmada, creando relación de curso..."
# "Curso creado automáticamente: [ID] para [Materia]"
```

## Características del Sistema de Mensajes

✅ Mensajes en tiempo real  
✅ Contador de mensajes no leídos  
✅ Búsqueda de conversaciones  
✅ Historial completo de mensajes  
✅ Notificaciones cuando llega un mensaje nuevo  
✅ Marcado automático como leído al abrir conversación  
✅ Validación de relación activa (curso o cita)  

## URLs Directas

- **Frontend**: http://localhost:5173
- **Mensajes**: http://localhost:5173/dashboard/mensajes
- **Cursos**: http://localhost:5173/dashboard/cursos
- **Tutores**: http://localhost:5173/dashboard/tutores

## Notas Importantes

- Los cursos se crean **automáticamente** cuando se confirma una cita
- No es necesario crear cursos manualmente
- La relación se mantiene incluso después de completar las citas
- Los estudiantes pueden tener múltiples cursos con el mismo tutor (diferentes materias)

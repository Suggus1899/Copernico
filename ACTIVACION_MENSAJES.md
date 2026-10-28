# Activación del Sistema de Mensajes

## Problema Resuelto

El sistema de mensajes no funcionaba correctamente porque requería que existiera una relación activa de **curso** entre estudiante y tutor, pero el sistema solo estaba creando **citas** (appointments) sin generar los cursos correspondientes.

## Solución Implementada

### 1. Creación Automática de Cursos desde Citas

Se modificó el controlador de citas (`src/controllers/appointment.controller.js`) para que automáticamente cree o actualice cursos cuando:

- Se crea una cita con estado `confirmed`
- Se actualiza una cita a estado `confirmed`

#### Función Helper Agregada

```javascript
ensureCourseRelationship(appointment)
```

Esta función:
- Busca si existe un curso para el tutor y la materia
- Si no existe, crea un nuevo curso automáticamente
- Si existe, agrega al estudiante si no está inscrito
- Actualiza el perfil del estudiante con el curso

### 2. Script de Migración

Se creó el script `scripts/create_courses_from_appointments.js` para migrar las citas existentes:

```bash
npm run migrate:courses
```

Este script:
- Busca todas las citas confirmadas o completadas
- Agrupa por tutor y materia
- Crea cursos automáticamente
- Inscribe a los estudiantes correspondientes

### 3. Resultados de la Migración

```
📊 Resumen de migración:
   ✅ Cursos creados: 2
   🔄 Cursos actualizados: 0
   ❌ Errores: 0
```

## Cómo Funciona Ahora

### Para Estudiantes

1. El estudiante solicita una asesoría con un tutor
2. El tutor confirma la cita
3. **Automáticamente** se crea un curso para esa materia
4. El estudiante aparece en la sección "Mensajes" con el tutor disponible
5. Puede enviar mensajes al tutor desde:
   - La sección "Mensajes" directamente
   - El botón "Enviar mensaje" en "Cursos"

### Para Tutores

1. Cuando confirman una cita con un estudiante
2. **Automáticamente** se crea la relación de curso
3. El estudiante aparece en la sección "Mensajes"
4. Pueden enviar mensajes al estudiante

## Verificación del Sistema de Mensajes

El backend verifica dos tipos de relaciones para permitir mensajes:

1. **Relación de Curso Activa**: Estudiante inscrito en curso del tutor
2. **Cita Activa**: Cita en estado scheduled, confirmed, in-progress o completed

Con los cambios implementados, ambas verificaciones funcionan correctamente.

## Archivos Modificados

1. `src/controllers/appointment.controller.js`
   - Agregado import de Course
   - Agregada función `ensureCourseRelationship()`
   - Modificada función `createAppointment()`
   - Modificada función `updateAppointment()`

2. `package.json`
   - Agregado script `migrate:courses`

3. `scripts/create_courses_from_appointments.js` (nuevo)
   - Script de migración para citas existentes

## Próximos Pasos

El sistema ahora funciona automáticamente. Cada vez que:
- Se confirme una nueva cita → Se crea/actualiza el curso
- Un estudiante y tutor tengan una cita confirmada → Pueden enviarse mensajes

No se requiere ninguna acción manual adicional.

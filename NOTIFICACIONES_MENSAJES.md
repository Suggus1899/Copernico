# Sistema de Notificaciones de Mensajes

## Implementación Completada

Se ha implementado un sistema completo de notificaciones que alerta a los usuarios cuando reciben un nuevo mensaje.

## Características

### 1. Notificación Automática al Recibir Mensaje

Cuando un usuario envía un mensaje, automáticamente se crea una notificación para el receptor que incluye:

- **Título**: "💬 Nuevo mensaje de [Nombre del remitente]"
- **Contenido**: Primeros 100 caracteres del mensaje
- **Tipo**: `message_received`
- **Prioridad**: Media
- **Acción**: Enlace directo a la conversación con el remitente
- **Botón**: "Ver mensaje"

### 2. Toast de Notificación en Tiempo Real

El componente `NotificationToast` muestra notificaciones emergentes:

- **Frecuencia de verificación**: Cada 15 segundos
- **Duración del toast**: 10 segundos (auto-cierre)
- **Usuarios**: Todos los roles (estudiantes, tutores, asesores)
- **Iconos dinámicos**: Según el tipo de notificación
  - 💬 Mensajes
  - 📅 Citas
  - ✅ Confirmaciones
  - ❌ Cancelaciones
  - Y más...

### 3. Redirección Inteligente

Al hacer clic en una notificación de mensaje:
- Se marca automáticamente como leída
- Redirige directamente a la conversación con el remitente
- URL: `/dashboard/mensajes?userId=[ID_del_remitente]`

## Flujo de Funcionamiento

### Escenario: Estudiante recibe mensaje de tutor

1. **Tutor envía mensaje** desde `/dashboard/mensajes`
2. **Backend crea el mensaje** en la base de datos
3. **Backend crea notificación** automáticamente:
   ```javascript
   {
     userId: estudiante._id,
     title: "💬 Nuevo mensaje de José Gerardo",
     message: "Hola, ¿cómo vas con la tarea de física?",
     type: "message_received",
     actionUrl: "/dashboard/mensajes?userId=696cfbb250b156eff8a39203",
     actionLabel: "Ver mensaje"
   }
   ```
4. **Frontend verifica notificaciones** cada 15 segundos
5. **Toast aparece** en la esquina de la pantalla
6. **Estudiante hace clic** en la notificación
7. **Redirige a la conversación** con el tutor
8. **Notificación se marca como leída**

## Código Implementado

### Backend: Creación de Notificación

En `src/controllers/message.controller.js`:

```javascript
// Crear notificación mejorada para el receptor
const senderName = req.user.personalInfo?.firstName 
  ? `${req.user.personalInfo.firstName} ${req.user.personalInfo.lastName || ''}`.trim()
  : req.user.email;

await Notification.create({
  userId: receiver._id,
  title: `💬 Nuevo mensaje de ${senderName}`,
  message: text.length > 100 ? `${text.substring(0, 100)}...` : text,
  type: 'message_received',
  priority: 'medium',
  category: 'communication',
  relatedUser: req.user._id,
  actionUrl: `/dashboard/mensajes?userId=${req.user._id}`,
  actionLabel: 'Ver mensaje',
  deliveryMethod: ['in_app'],
  createdBy: req.user._id,
  updatedBy: req.user._id
});
```

### Frontend: Toast de Notificaciones

En `client/src/components/NotificationToast.jsx`:

- Verifica notificaciones no leídas cada 15 segundos
- Muestra toast con las últimas 3 notificaciones
- Iconos dinámicos según tipo de notificación
- Redirección inteligente al hacer clic

## Pruebas

### Cómo Probar

1. **Abre dos navegadores** (o uno normal y uno incógnito)
2. **Inicia sesión como estudiante** en el primer navegador
3. **Inicia sesión como tutor** en el segundo navegador
4. **Tutor envía mensaje** al estudiante
5. **Espera máximo 15 segundos**
6. **Toast aparece** en la pantalla del estudiante
7. **Haz clic en la notificación**
8. **Verifica** que redirige a la conversación correcta

### Verificación en Logs

Cuando se envía un mensaje, deberías ver en los logs del backend:

```
✅ Notificación de mensaje creada para [email_del_receptor]
```

## Configuración

### Frecuencia de Verificación

Para cambiar la frecuencia de verificación de notificaciones, edita en `NotificationToast.jsx`:

```javascript
// Cambiar 15000 (15 segundos) por el valor deseado en milisegundos
const interval = setInterval(fetchLatestNotifications, 15000);
```

### Duración del Toast

Para cambiar cuánto tiempo se muestra el toast:

```javascript
// Cambiar 10000 (10 segundos) por el valor deseado
setTimeout(() => {
  setShowToast(false);
}, 10000);
```

## Tipos de Notificaciones Soportadas

El sistema soporta múltiples tipos de notificaciones con iconos específicos:

- 💬 `message_received` - Nuevo mensaje
- 📅 `appointment_reminder` - Recordatorio de cita
- ✅ `appointment_confirmed` - Cita confirmada
- ❌ `appointment_cancelled` - Cita cancelada
- 📝 `assignment_due` - Tarea por vencer
- 📚 `new_material` - Nuevo material educativo
- 🎓 `grade_posted` - Calificación publicada
- 📊 `progress_update` - Actualización de progreso
- ⚠️ `system_alert` - Alerta del sistema
- 👋 `welcome` - Bienvenida
- 📢 `announcement` - Anuncio

## Mejoras Futuras

Posibles mejoras al sistema:

1. **Notificaciones push** del navegador
2. **Sonido** al recibir notificación
3. **Badge** con contador en el icono de mensajes
4. **Notificaciones por email** para mensajes importantes
5. **Agrupación** de notificaciones del mismo remitente
6. **Modo no molestar** para desactivar temporalmente
7. **WebSockets** para notificaciones en tiempo real (sin polling)

## Solución de Problemas

### No aparecen notificaciones

1. Verifica que el usuario tenga el rol correcto
2. Revisa la consola del navegador para errores
3. Verifica que el backend esté corriendo
4. Comprueba que se estén creando notificaciones en la BD

### Toast no se cierra automáticamente

- Verifica que no haya errores en la consola
- Comprueba que el timeout esté configurado correctamente

### Notificaciones duplicadas

- El sistema previene duplicados usando `lastNotificationId`
- Si persiste, limpia el localStorage del navegador

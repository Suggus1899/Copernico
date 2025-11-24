import express from "express";
import cors from "cors";
import morgan from "morgan";

const app = express();

// Importar rutas existentes
import notesRoutes from "./routes/notes.routes.js";
import usersRoutes from "./routes/users.routes.js";
import authRoutes from "./routes/auth.routes.js";

// Importar TODAS las rutas de las colecciones del sistema académico
import availabilityRoutes from "./routes/availability.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import educationalMaterialRoutes from "./routes/educationalMaterial.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import progressTrackingRoutes from "./routes/progressTracking.routes.js";
import reportRoutes from "./routes/report.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

// settings
app.set("port", process.env.PORT || 4000);

// middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'auth-token']
}));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Para form data

// routes
app.use("/api", notesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);

// SISTEMA ACADÉMICO COMPLETO - 8 Colecciones
app.use("/api/availability", availabilityRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/materials", educationalMaterialRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/progress", progressTrackingRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);

// Ruta de salud/status
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "S.I-COPERNICO-ACADEMY API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    collections: [
      "users",
      "availability_slots", 
      "appointments",
      "educational_materials",
      "assignments",
      "progress_tracking",
      "reports",
      "notifications"
    ]
  });
});

// Ruta principal con documentación completa
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to S.I-COPERNICO-ACADEMY API",
    description: "Complete Academic Support System API",
    version: "1.0.0",
    endpoints: {
      // Sistema de autenticación y usuarios
      auth: {
        login: "POST /api/auth/login",
        register: "POST /api/auth/register",
        profile: "GET /api/auth/profile"
      },
      users: {
        base: "GET/POST /api/users",
        profile: "GET/PUT /api/users/profile",
        specific: "GET/PUT/DELETE /api/users/:id"
      },
      
      // Sistema académico principal
      availability: {
        base: "GET/POST /api/availability",
        available: "GET /api/availability/available",
        my_slots: "GET /api/availability/my-slots",
        specific: "GET/PUT/DELETE /api/availability/:id"
      },
      appointments: {
        base: "GET/POST /api/appointments",
        upcoming: "GET /api/appointments/upcoming",
        specific: "GET/PUT /api/appointments/:id",
        cancel: "PATCH /api/appointments/:id/cancel",
        notes: "POST /api/appointments/:id/notes",
        rate: "POST /api/appointments/:id/rate"
      },
      materials: {
        base: "GET/POST /api/materials",
        popular: "GET /api/materials/popular",
        my_materials: "GET /api/materials/my/materials",
        specific: "GET/PUT/DELETE /api/materials/:id",
        rate: "POST /api/materials/:id/rate",
        download: "PATCH /api/materials/:id/download"
      },
      assignments: {
        base: "GET/POST /api/assignments",
        my_assignments: "GET /api/assignments/my-assignments",
        pending: "GET /api/assignments/pending",
        specific: "GET/PUT /api/assignments/:id",
        submit: "POST /api/assignments/:id/submit",
        grade: "POST /api/assignments/:id/grade"
      },
      progress: {
        base: "GET/POST /api/progress",
        my_progress: "GET /api/progress/my-progress",
        student_progress: "GET /api/progress/student-progress",
        statistics: "GET /api/progress/statistics",
        specific: "GET/PUT /api/progress/:id"
      },
      reports: {
        base: "GET/POST /api/reports",
        templates: "GET /api/reports/templates",
        specific: "GET /api/reports/:id",
        generate: "POST /api/reports/:id/generate",
        deliver: "POST /api/reports/:id/deliver"
      },
      notifications: {
        base: "GET /api/notifications",
        unread_count: "GET /api/notifications/unread-count",
        stats: "GET /api/notifications/stats",
        specific: "GET /api/notifications/:id",
        mark_read: "PATCH /api/notifications/:id/read",
        mark_all_read: "PATCH /api/notifications/read-all",
        respond: "POST /api/notifications/:id/respond"
      },
      
      // Utilidades
      health: "GET /api/health"
    },
    user_roles: {
      student: "Acceso a sus propios datos, tareas, progreso",
      tutor: "Gestión de horarios, estudiantes, materiales, calificaciones",
      advisor: "Orientación, seguimiento de progreso, reportes",
      admin: "Acceso completo al sistema"
    }
  });
});

// Manejo de errores 404
app.use((req, res, next) => {
  const error = new Error(`Endpoint Not Found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Log más detallado en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', err.stack);
  }
  
  res.status(err.status || 500);
  res.json({
    success: false,
    error: {
      status: err.status || 500,
      message: err.message || "Internal Server Error",
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        path: req.originalUrl,
        method: req.method
      })
    }
  });
});

export default app;
import mongoose from 'mongoose';
import type { Types } from 'mongoose';
import dotenv from 'dotenv';
import Appointment from '../src/models/Appointment.js';
import Course from '../src/models/Course.js';
import User from '../src/models/User.js';

dotenv.config();

type LegacyPopulatedUser = { _id: Types.ObjectId; email: string; personalInfo?: { firstName?: string | null; lastName?: string | null } | null };
type LegacyAppointment = { _id: Types.ObjectId; professionalId?: LegacyPopulatedUser | null; studentId?: LegacyPopulatedUser | null; subject?: string | null };
type CourseSeed = { instructor: Types.ObjectId; subject: string; students: Set<string> };

const createCoursesFromAppointments = async () => {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/merndatabase');
    console.log('✅ Conectado a MongoDB');

    // Obtener todas las citas confirmadas o completadas
    const appointments = await Appointment.find({
      status: { $in: ['confirmed', 'completed'] }
    }).populate('studentId professionalId') as unknown as LegacyAppointment[];

    console.log(`📋 Encontradas ${appointments.length} citas confirmadas/completadas`);

    // Agrupar por tutor y materia
    const courseMap = new Map<string, CourseSeed>();

    appointments.forEach(appointment => {
      if (!appointment.professionalId || !appointment.studentId || !appointment.subject) {
        console.log(`⚠️  Cita ${appointment._id} sin datos completos, omitiendo...`);
        return;
      }

      const key = `${appointment.professionalId._id}-${appointment.subject}`;
      
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          instructor: appointment.professionalId._id,
          subject: appointment.subject,
          students: new Set()
        });
      }

      courseMap.get(key)!.students.add(appointment.studentId._id.toString());
    });

    console.log(`📚 Se crearán/actualizarán ${courseMap.size} cursos`);

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const [key, data] of courseMap.entries()) {
      try {
        // Buscar si ya existe el curso
        let course = await Course.findOne({
          instructor: data.instructor,
          title: data.subject
        });

        if (!course) {
          // Crear nuevo curso
          course = await Course.create({
            title: data.subject,
            description: `Curso de ${data.subject} - Generado automáticamente desde asesorías`,
            instructor: data.instructor,
            category: data.subject,
            level: 'intermediate',
            isPublished: true,
            enrolledStudents: Array.from(data.students).map(studentId => ({
              student: studentId,
              enrolledAt: new Date(),
              progress: 0,
              completed: false
            }))
          });
          created++;
          console.log(`✅ Curso creado: ${data.subject} (Instructor: ${data.instructor})`);
        } else {
          // Actualizar curso existente agregando estudiantes nuevos
          let studentsAdded = 0;
          for (const studentId of data.students) {
            const isEnrolled = course.enrolledStudents.some(
              enrollment => enrollment.student!.toString() === studentId
            );

            if (!isEnrolled) {
              course.enrolledStudents.push({
                student: studentId,
                enrolledAt: new Date(),
                progress: 0,
                completed: false
              });
              studentsAdded++;
            }
          }

          if (studentsAdded > 0) {
            await course.save();
            updated++;
            console.log(`🔄 Curso actualizado: ${data.subject} (+${studentsAdded} estudiantes)`);
          } else {
            console.log(`ℹ️  Curso ya existente sin cambios: ${data.subject}`);
          }
        }

        // Actualizar perfiles de estudiantes
        for (const studentId of data.students) {
          await User.findByIdAndUpdate(studentId, {
            $addToSet: { "studentProfile.enrolledCourses": course._id }
          });
        }

      } catch (error) {
        errors++;
        console.error(`❌ Error procesando curso ${data.subject}:`, (error as Error).message);
      }
    }

    console.log('\n📊 Resumen de migración:');
    console.log(`   ✅ Cursos creados: ${created}`);
    console.log(`   🔄 Cursos actualizados: ${updated}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log('\n✨ Migración completada');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
};

createCoursesFromAppointments();

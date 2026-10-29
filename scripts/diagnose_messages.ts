import mongoose from 'mongoose';
import type { Types } from 'mongoose';
import dotenv from 'dotenv';
import Appointment from '../src/models/Appointment.js';
import Course from '../src/models/Course.js';
import User from '../src/models/User.js';
import Message from '../src/models/Message.js';

dotenv.config();

type PopulatedUser = { _id: Types.ObjectId; email: string; role?: string; personalInfo?: { firstName?: string | null; lastName?: string | null } | null };
type DiagnosticAppointment = { status: string; subject?: string | null; studentId?: PopulatedUser | null; professionalId?: PopulatedUser | null };
type DiagnosticCourse = { title: string; instructor?: PopulatedUser | null; enrolledStudents: Array<{ student?: PopulatedUser | null }> };
type DiagnosticMessage = { sender?: PopulatedUser | null; receiver?: PopulatedUser | null; text: string };

const diagnoseMessages = async () => {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/merndatabase');
    console.log('✅ Conectado a MongoDB\n');

    // Obtener todos los usuarios
    const users = await User.find().select('_id email role personalInfo') as unknown as PopulatedUser[];
    console.log('👥 USUARIOS EN EL SISTEMA:');
    users.forEach(user => {
      const name = user.personalInfo?.firstName 
        ? `${user.personalInfo.firstName} ${user.personalInfo.lastName || ''}`.trim()
        : user.email;
      console.log(`   - ${name} (${user.role}) - ID: ${user._id}`);
    });

    // Obtener todas las citas
    const appointments = await Appointment.find()
      .populate('studentId', 'email personalInfo')
      .populate('professionalId', 'email personalInfo') as unknown as DiagnosticAppointment[];
    
    console.log('\n📅 CITAS EN EL SISTEMA:');
    console.log(`   Total: ${appointments.length}`);
    
    const appointmentsByStatus: Record<string, number> = {};
    appointments.forEach(apt => {
      appointmentsByStatus[apt.status] = (appointmentsByStatus[apt.status] || 0) + 1;
      
      const studentName = apt.studentId?.personalInfo?.firstName 
        ? `${apt.studentId.personalInfo.firstName} ${apt.studentId.personalInfo.lastName || ''}`.trim()
        : apt.studentId?.email || 'Desconocido';
      
      const tutorName = apt.professionalId?.personalInfo?.firstName
        ? `${apt.professionalId.personalInfo.firstName} ${apt.professionalId.personalInfo.lastName || ''}`.trim()
        : apt.professionalId?.email || 'Desconocido';
      
      console.log(`   - ${apt.subject} | ${studentName} ↔ ${tutorName} | Estado: ${apt.status}`);
    });
    
    console.log('\n   Por estado:');
    Object.entries(appointmentsByStatus).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });

    // Obtener todos los cursos
    const courses = await Course.find()
      .populate('instructor', 'email personalInfo')
      .populate('enrolledStudents.student', 'email personalInfo') as unknown as DiagnosticCourse[];
    
    console.log('\n📚 CURSOS EN EL SISTEMA:');
    console.log(`   Total: ${courses.length}`);
    
    courses.forEach(course => {
      const instructorName = course.instructor?.personalInfo?.firstName
        ? `${course.instructor.personalInfo.firstName} ${course.instructor.personalInfo.lastName || ''}`.trim()
        : course.instructor?.email || 'Desconocido';
      
      console.log(`\n   📖 ${course.title}`);
      console.log(`      Instructor: ${instructorName} (${course.instructor?._id})`);
      console.log(`      Estudiantes inscritos: ${course.enrolledStudents.length}`);
      
      course.enrolledStudents.forEach(enrollment => {
        const studentName = enrollment.student?.personalInfo?.firstName
          ? `${enrollment.student.personalInfo.firstName} ${enrollment.student.personalInfo.lastName || ''}`.trim()
          : enrollment.student?.email || 'Desconocido';
        console.log(`         - ${studentName} (${enrollment.student?._id})`);
      });
    });

    // Obtener todos los mensajes
    const messages = await Message.find()
      .populate('sender', 'email personalInfo')
      .populate('receiver', 'email personalInfo') as unknown as DiagnosticMessage[];
    
    console.log('\n💬 MENSAJES EN EL SISTEMA:');
    console.log(`   Total: ${messages.length}`);
    
    if (messages.length > 0) {
      messages.forEach(msg => {
        const senderName = msg.sender?.personalInfo?.firstName
          ? `${msg.sender.personalInfo.firstName} ${msg.sender.personalInfo.lastName || ''}`.trim()
          : msg.sender?.email || 'Desconocido';
        
        const receiverName = msg.receiver?.personalInfo?.firstName
          ? `${msg.receiver.personalInfo.firstName} ${msg.receiver.personalInfo.lastName || ''}`.trim()
          : msg.receiver?.email || 'Desconocido';
        
        console.log(`   - ${senderName} → ${receiverName}: "${msg.text.substring(0, 50)}${msg.text.length > 50 ? '...' : ''}"`);
      });
    }

    // Análisis de relaciones para mensajería
    console.log('\n🔗 ANÁLISIS DE RELACIONES PARA MENSAJERÍA:');
    
    for (const user of users) {
      if (user.role === 'student') {
        console.log(`\n   👨‍🎓 Estudiante: ${user.personalInfo?.firstName || user.email}`);
        
        // Citas activas
        const studentAppointments = appointments.filter(apt => 
          String(apt.studentId?._id) === String(user._id) &&
          ['scheduled', 'confirmed', 'in-progress', 'completed'].includes(apt.status)
        );
        
        console.log(`      Citas activas: ${studentAppointments.length}`);
        studentAppointments.forEach(apt => {
          const tutorName = apt.professionalId?.personalInfo?.firstName
            ? `${apt.professionalId.personalInfo.firstName} ${apt.professionalId.personalInfo.lastName || ''}`.trim()
            : apt.professionalId?.email || 'Desconocido';
          console.log(`         - Con ${tutorName} (${apt.subject})`);
        });
        
        // Cursos inscritos
        const studentCourses = courses.filter(course =>
          course.enrolledStudents.some(e => String(e.student?._id) === String(user._id))
        );
        
        console.log(`      Cursos inscritos: ${studentCourses.length}`);
        studentCourses.forEach(course => {
          const instructorName = course.instructor?.personalInfo?.firstName
            ? `${course.instructor.personalInfo.firstName} ${course.instructor.personalInfo.lastName || ''}`.trim()
            : course.instructor?.email || 'Desconocido';
          console.log(`         - ${course.title} con ${instructorName}`);
        });
        
        // Puede enviar mensajes a
        const canMessageIds = new Set<string>();
        studentAppointments.forEach(apt => {
          if (apt.professionalId?._id) {
            canMessageIds.add(String(apt.professionalId._id));
          }
        });
        studentCourses.forEach(course => {
          if (course.instructor?._id) {
            canMessageIds.add(String(course.instructor._id));
          }
        });
        
        console.log(`      ✅ Puede enviar mensajes a ${canMessageIds.size} tutores/asesores`);
      }
    }

    console.log('\n✨ Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error en el diagnóstico:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
};

diagnoseMessages();

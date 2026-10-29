import mongoose from 'mongoose';
import type { Types, UpdateQuery } from 'mongoose';
import type { UserRecord } from '../src/models/User.js';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

type AdvisorProfile = {
  specializationAreas?: string[];
  appointmentDuration?: number;
  available?: boolean;
  rating?: number;
  specialties?: string[];
  teachingMethods?: string[];
  maxStudents?: number;
  hourlyRate?: number;
  totalSessions?: number;
};
type LegacyAdvisor = {
  _id: Types.ObjectId;
  email: string;
  personalInfo?: { firstName?: string | null; lastName?: string | null } | null;
  advisorProfile?: AdvisorProfile | null;
  tutorProfile?: AdvisorProfile | null;
};

const migrateAdvisorsToTutors = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/merndatabase');
    console.log('✅ Conectado a MongoDB');

    // Buscar todos los usuarios con rol 'advisor'
    const advisors = await User.find({ role: 'advisor' }) as unknown as LegacyAdvisor[];
    console.log(`📊 Encontrados ${advisors.length} usuarios con rol 'advisor'`);

    if (advisors.length === 0) {
      console.log('✅ No hay usuarios advisor para migrar');
      return;
    }

    // Migrar cada advisor a tutor
    for (const advisor of advisors) {
      console.log(`🔄 Migrando usuario: ${advisor.personalInfo?.firstName} ${advisor.personalInfo?.lastName} (${advisor.email})`);
      
      // Preparar datos de migración
      const updateData: Record<string, unknown> = {
        role: 'tutor',
        updatedBy: advisor._id, // Auto-actualización
        updatedAt: new Date()
      };

      // Migrar datos del advisorProfile al tutorProfile
      if (advisor.advisorProfile) {
        const newTutorProfile = {
          ...advisor.tutorProfile, // Mantener datos existentes del tutorProfile si los hay
          specializationAreas: advisor.advisorProfile.specializationAreas || [],
          appointmentDuration: advisor.advisorProfile.appointmentDuration || 60,
          available: advisor.advisorProfile.available !== undefined ? advisor.advisorProfile.available : true,
          rating: advisor.advisorProfile.rating || 0,
          // Mantener campos específicos de tutor
          specialties: advisor.tutorProfile?.specialties || advisor.advisorProfile.specializationAreas || [],
          teachingMethods: advisor.tutorProfile?.teachingMethods || [],
          maxStudents: advisor.tutorProfile?.maxStudents || 10,
          hourlyRate: advisor.tutorProfile?.hourlyRate || 0,
          totalSessions: advisor.tutorProfile?.totalSessions || 0
        };

        updateData.tutorProfile = newTutorProfile;
        updateData.$unset = { advisorProfile: 1 }; // Eliminar advisorProfile
      }

      // Actualizar el usuario
      await User.findByIdAndUpdate(advisor._id, updateData as UpdateQuery<UserRecord>);
      console.log(`✅ Usuario migrado exitosamente`);
    }

    console.log(`🎉 Migración completada: ${advisors.length} usuarios advisor convertidos a tutor`);

    // Verificar la migración
    const remainingAdvisors = await User.countDocuments({ role: 'advisor' });
    const totalTutors = await User.countDocuments({ role: 'tutor' });
    
    console.log(`📊 Verificación post-migración:`);
    console.log(`   - Advisors restantes: ${remainingAdvisors}`);
    console.log(`   - Total de tutores: ${totalTutors}`);

    if (remainingAdvisors === 0) {
      console.log('✅ Migración verificada: No quedan usuarios advisor');
    } else {
      console.log('⚠️  Advertencia: Aún quedan usuarios advisor');
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
  }
};

// Ejecutar migración si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Iniciando migración de usuarios advisor a tutor...');
  migrateAdvisorsToTutors()
    .then(() => {
      console.log('✅ Migración completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en la migración:', error);
      process.exit(1);
    });
}

export default migrateAdvisorsToTutors;

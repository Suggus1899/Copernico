import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Course from '../src/models/Course.js';
import { isStrongPassword } from '../src/utils/passwordPolicy.js';

export function assertDemoDatabase(database: string | undefined) {
  if (process.env.NODE_ENV === 'production' || !database || !/^(?:test|.+_(?:demo|test))$/.test(database)) {
    throw new Error('Demo: usa una base con sufijo _demo o _test y NODE_ENV distinto de production.');
  }
}

export async function seedDemo(password: string) {
  assertDemoDatabase(mongoose.connection.name);
  if (!isStrongPassword(password)) throw new Error('Demo: configura DEMO_PASSWORD con una contraseña fuerte.');
  const accounts = [
    { email: 'ana@copernico.example', role: 'student', firstName: 'Ana', studentProfile: { studentId: 'DEMO-001' } },
    { email: 'bruno@copernico.example', role: 'student', firstName: 'Bruno', studentProfile: { studentId: 'DEMO-002' } },
    { email: 'luis@copernico.example', role: 'tutor', firstName: 'Luis', tutorProfile: { specialties: ['Matemáticas'] } },
    { email: 'marta@copernico.example', role: 'tutor', firstName: 'Marta', tutorProfile: { specialties: ['Física'] } },
    { email: 'admin@copernico.example', role: 'admin', firstName: 'Administración' },
  ];
  for (const { firstName, ...account } of accounts) {
    let user = await User.findOne({ email: account.email });
    if (!user) user = await User.create({ ...account, password, personalInfo: { firstName, lastName: 'Demo' } });
    if (user.role !== account.role) throw new Error('Demo: una cuenta de ejemplo existente tiene otro rol.');
    if (account.role === 'tutor') {
      const title = account.tutorProfile!.specialties[0];
      await Course.updateOne({ title, instructor: user._id }, { $setOnInsert: { title, instructor: user._id, isPublished: true, level: 'beginner' } }, { upsert: true, runValidators: true });
    }
  }
  return accounts.map(account => account.email);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const uri = process.env.MONGODB_URI;
    assertDemoDatabase(uri?.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/)?.[1]);
    if (!isStrongPassword(process.env.DEMO_PASSWORD)) throw new Error('Demo: configura DEMO_PASSWORD con una contraseña fuerte.');
    const { connectDatabase, disconnectDatabase } = await import('../src/database.js');
    try {
      await connectDatabase(uri);
      const emails = await seedDemo(process.env.DEMO_PASSWORD!);
      console.log(`Datos demo disponibles: ${emails.join(', ')}. Las cuentas existentes conservan su contraseña.`);
    } finally { await disconnectDatabase(); }
  } catch (error) {
    console.error(error instanceof Error && error.message.startsWith('Demo:') ? error.message : 'No se pudieron crear los datos demo. Revisa la conexión y los permisos de la base de pruebas.');
    process.exitCode = 1;
  }
}

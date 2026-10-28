import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('Connected. Creating unique index on users.email ...');
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true, background: true });
    console.log('Unique index on users.email created successfully');
  } catch (err) {
    console.error('Error creating index:', err.message);
  }

  await mongoose.disconnect();
  console.log('Done.');
};

run().catch((e) => { console.error(e); process.exit(1); });
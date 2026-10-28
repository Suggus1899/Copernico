import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected. Copying email -> personalInfo.contactEmail where missing ...');

  const cursor = User.find({}).cursor();
  let count = 0;
  for await (const user of cursor) {
    if (!user.personalInfo) user.personalInfo = {};
    if (!user.personalInfo.contactEmail && user.email) {
      user.personalInfo.contactEmail = user.email;
      await user.save();
      count++;
    }
  }

  console.log(`Updated ${count} users.`);
  await mongoose.disconnect();
  console.log('Done.');
};

run().catch((e) => { console.error(e); process.exit(1); });
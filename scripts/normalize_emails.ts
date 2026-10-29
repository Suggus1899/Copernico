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
  console.log('Connected. Normalizing emails to lowercase+trim and detecting duplicates...');

  let updated = 0;
  const cursor = User.find({}).select('email').cursor();
  for await (const user of cursor) {
    const normalized = (user.email || '').trim().toLowerCase();
    if (normalized && normalized !== user.email) {
      user.email = normalized;
      await user.save();
      updated++;
    }
  }
  console.log(`Normalized ${updated} user emails.`);

  const duplicates = await User.aggregate([
    { $group: { _id: '$email', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]);

  if (duplicates.length) {
    console.warn('Found duplicate emails after normalization. Review required:');
    for (const d of duplicates) {
      console.warn(`email=${d._id} count=${d.count} ids=${d.ids.join(',')}`);
    }
    console.warn('Resolve duplicates BEFORE creating unique index.');
  } else {
    console.log('No duplicates found. Safe to create unique index on users.email.');
  }

  await mongoose.disconnect();
  console.log('Done.');
};

run().catch((e) => { console.error(e); process.exit(1); });
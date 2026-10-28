// Inicializa el replica set que usa docker compose en desarrollo.
// Las transacciones de MongoDB (reserva de citas) exigen replica set.
// Es idempotente: si el replica set ya existe, no hace nada.
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "mongodb://db:27017/?directConnection=true";
const replSetName = process.env.RS_NAME || "rs0";
const memberHost = process.env.RS_MEMBER_HOST || "db:27017";

async function connectWithRetry(attempts = 60) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await mongoose.connect(uri, { directConnection: true, serverSelectionTimeoutMS: 2000 });
      return;
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function initiateIfNeeded(admin) {
  try {
    await admin.command({ replSetGetStatus: 1 });
    console.log(`[rs-init] replica set "${replSetName}" ya inicializado`);
  } catch (error) {
    if (error.codeName !== "NotYetInitialized") throw error;
    await admin.command({ replSetInitiate: { _id: replSetName, members: [{ _id: 0, host: memberHost }] } });
    console.log(`[rs-init] replica set "${replSetName}" inicializado con ${memberHost}`);
  }
}

async function waitForPrimary(admin, attempts = 60) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const hello = await admin.command({ hello: 1 });
    if (hello.isWritablePrimary) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("El replica set no eligió primario a tiempo");
}

try {
  await connectWithRetry();
  const admin = mongoose.connection.db.admin();
  await initiateIfNeeded(admin);
  await waitForPrimary(admin);
  console.log("[rs-init] primario disponible");
} finally {
  await mongoose.disconnect();
}

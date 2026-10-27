import mongoose from "mongoose";
import { config, redactUri } from "./config.js";

// Las transacciones (reservas de citas) requieren un replica set; Atlas lo es por defecto.
async function describeTopology() {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  return { replicaSet: Boolean(hello.setName), setName: hello.setName };
}

/**
 * Conecta a MongoDB. Lanza el error original si no se puede conectar;
 * quien llama decide si termina el proceso.
 */
export async function connectDatabase(uri = config.MONGODB_URI) {
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (error) {
    error.message = `No se pudo conectar a MongoDB (${redactUri(uri)}): ${error.message}`;
    throw error;
  }

  // Espera a que existan los índices (p. ej. email único) antes de aceptar peticiones.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));

  const topology = await describeTopology();
  console.log(`MongoDB conectado: ${mongoose.connection.name}`);
  if (!topology.replicaSet) {
    console.warn("MongoDB no es un replica set: las reservas de citas fallarán. Usa replicaSet=rs0 o Atlas.");
  }
  return topology;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export function databaseReadiness() {
  return mongoose.connection.readyState === 1;
}

export async function pingDatabase() {
  await mongoose.connection.db.admin().ping();
}

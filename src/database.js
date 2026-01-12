import mongoose from "mongoose";
import { MONGODB_URI } from "./config.js";

mongoose.set("strictQuery", false);

// Connection options with timeout settings
const options = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 10s
  socketTimeoutMS: 45000,
};

try {
  const conn = await mongoose.connect(MONGODB_URI, options);
  console.log(` MongoDB Connected: ${conn.connection.host}`);
  console.log(` Database: ${conn.connection.db.databaseName}`);
} catch (error) {
  console.error(" Error connecting to MongoDB:", error.message);
  console.error("\n SOLUCIÓN:");
  console.error("1. Si usas MongoDB local, asegúrate de que esté corriendo:");
  console.error("   - Windows: Instala MongoDB Community Server");
  console.error("   - O usa MongoDB Atlas (gratis): https://www.mongodb.com/cloud/atlas");
  console.error("\n2. Crea un archivo .env en la raíz del proyecto con:");
  console.error("   MONGODB_URI=mongodb://localhost:27017/merndatabase");
  console.error("   (o tu URI de MongoDB Atlas)");
  console.error("\n3. URI actual intentada:", MONGODB_URI);
  console.error("\n⚠️  El servidor no puede continuar sin la base de datos.\n");
  process.exit(1); // Exit the process if database connection fails
}

mongoose.connection.on("connected", () => {
  console.log("Database is connected to", mongoose.connection.db.databaseName);
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

import mongoose from "mongoose";

export async function connectMasterDatabase(): Promise<void> {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  const mongoUri = runtime.process?.env?.MONGODB_MASTER_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_MASTER_URI is not configured");
  }

  try {
    await mongoose.connect(mongoUri);

    console.log("Master MongoDB connected successfully");
  } catch (error) {
    console.error("Master MongoDB connection failed:", error);
    throw error;
  }
}
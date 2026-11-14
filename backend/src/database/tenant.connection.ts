
import mongoose, { Connection } from "mongoose";

const tenantConnections = new Map<string, Connection>();

export async function connectTenantDatabase(
  databaseName: string
): Promise<Connection> {
  if (!databaseName) {
    throw new Error("Database name is required");
  }

  const existingConnection = tenantConnections.get(databaseName);

  if (existingConnection?.readyState === 1) {
    return existingConnection;
  }

  const masterUri = process.env.MONGODB_MASTER_URI;

  if (!masterUri) {
    throw new Error("MONGODB_MASTER_URI is not configured");
  }

  const tenantUri = masterUri.replace(
    /\/[^/?]+(\?|$)/,
    `/${databaseName}$1`
  );

  const connection = mongoose.createConnection(tenantUri);

  await connection.asPromise();

  tenantConnections.set(databaseName, connection);

  console.log(`Tenant database connected: ${databaseName}`);

  return connection;
}
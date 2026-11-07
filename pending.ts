import "server-only";
import { db } from "./db";

/** Apaga conexões pendentes abandonadas há mais de 30 minutos. */
export async function cleanupPendingConnections() {
  await db.pendingConnection.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } } });
}

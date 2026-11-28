import { createApp } from './app';
import { env } from './config/env';
import { closeRedis, connectRedis } from './config/redis';
import { closeAllTenantConnections } from './database/tenant.connection';
import { registerIdempotencyGuard } from './services/idempotency.service';

function main(): void {
  connectRedis();
  registerIdempotencyGuard();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`LedgerGuard API listening on :${env.port} (${env.nodeEnv})`);
  });

  function shutdown(signal: string): void {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      void Promise.all([closeAllTenantConnections(), closeRedis()]).finally(() => process.exit(0));
    });
  }
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();

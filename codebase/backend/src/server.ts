import { createApp } from './app';
import { env } from './config/env';

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`LedgerGuard API listening on :${env.port} (${env.nodeEnv})`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));


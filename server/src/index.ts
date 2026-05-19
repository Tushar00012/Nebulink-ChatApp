import http from 'http';
import app from './app';
import { connectDb } from './config/db';
import { env } from './config/env';
import { initSocket } from './sockets';

async function main() {
  await connectDb();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
